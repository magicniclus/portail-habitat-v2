import {
  adresseArticle,
  assainirCorps,
  controleSeo,
  type ControleSeo,
  type StatutArticle,
} from '@ph/core/blog';
import { ErreurMetier } from '@ph/core/erreurs';
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ContexteSite } from '../sites/edition';
import { exigerBlog, lireMentionsBlog, type ServicesBlog } from './acces';

export interface EntreeArticle {
  articleId?: string;
  titre: string;
  sousTitre: string;
  slug?: string;
  corpsHtml: string;
  image: { src: string; alt: string };
  meta: string;
  motCle: string;
  motsSecondaires: string[];
  categorieId: string;
  tags: string[];
  auteurUid?: string;
}

const EN_LIGNE: StatutArticle[] = ['publie', 'planifie'];

/**
 * Enregistre un article (BLOG §3) : corps assaini (BLOG-09), adresse unique qui suit le titre
 * tant qu'elle n'est pas fixée, ancienne adresse gardée pour la redirection 301 (BLOG §7),
 * contrôle SEO recalculé avec les mentions lues en direct. Un article en ligne ne peut pas être
 * enregistré avec un point bloquant.
 */
export async function enregistrerArticle(
  s: ServicesBlog,
  ctx: ContexteSite,
  e: EntreeArticle,
): Promise<{ articleId: string; slug: string; seo: ControleSeo }> {
  const corpsHtml = assainirCorps(e.corpsHtml);
  const mentions = await lireMentionsBlog(s.db, ctx.artisanId);
  const col = s.db.collection(chemins.articlesBlog(ctx.artisanId));
  const ref = e.articleId ? col.doc(e.articleId) : col.doc();
  return s.db.runTransaction(async (t) => {
    await exigerBlog(s, t, ctx);
    const [avantDoc, tous, categorie, tags] = await Promise.all([
      e.articleId ? t.get(ref) : null,
      t.get(col.select('slug', 'anciensSlugs')),
      e.categorieId ? t.get(s.db.doc(chemins.categorieBlog(ctx.artisanId, e.categorieId))) : null,
      e.tags.length
        ? t.getAll(...e.tags.map((x) => s.db.doc(chemins.tagBlog(ctx.artisanId, x))))
        : [],
    ]);
    const avant = avantDoc?.data();
    if (e.articleId && !avant) throw new ErreurMetier('INTROUVABLE');
    if (avant?.supprimeLe)
      throw new ErreurMetier('PRECONDITION', 'Restaurez l’article avant de le modifier.');
    if (categorie && !categorie.exists)
      throw new ErreurMetier('ENTREE_INVALIDE', 'Cette catégorie n’existe plus.');
    const prises = tous.docs
      .filter((d) => d.id !== ref.id)
      .flatMap((d) => [d.get('slug') as string, ...((d.get('anciensSlugs') as string[]) ?? [])]);
    if (e.slug && prises.includes(e.slug))
      throw new ErreurMetier('CONFLIT', 'Cette adresse est déjà utilisée par un autre article.');
    const slug = e.slug ?? adresseArticle(e.titre || 'article', prises);
    const statut = (avant?.statut as StatutArticle | undefined) ?? 'brouillon';
    const dejaPublie = avant && (statut === 'publie' || avant.anciensSlugs?.length);
    const anciensSlugs = [
      ...((avant?.anciensSlugs as string[] | undefined) ?? []),
      ...(dejaPublie && avant.slug !== slug ? [avant.slug as string] : []),
    ]
      .filter((x) => x !== slug)
      .slice(-20);
    const seo = controleSeo({ ...e, corpsHtml }, { mentionsCompletes: mentions.complet });
    if (EN_LIGNE.includes(statut) && seo.bloquants.length)
      throw new ErreurMetier(
        'PRECONDITION',
        `Article en ligne : corrigez d’abord ${seo.bloquants.map((b) => b.libelle.toLowerCase()).join(', ')}, ou repassez-le en brouillon.`,
      );
    const maintenant = Timestamp.fromMillis(s.horloge());
    t.set(ref, {
      schemaVersion: 1,
      titre: e.titre,
      sousTitre: e.sousTitre,
      slug,
      slugAuto: !e.slug,
      anciensSlugs,
      corpsHtml,
      image: e.image,
      meta: e.meta,
      motCle: e.motCle,
      motsSecondaires: e.motsSecondaires,
      categorieId: e.categorieId,
      tags: tags.filter((x) => x.exists).map((x) => x.id),
      auteurUid: e.auteurUid ?? (avant?.auteurUid as string | undefined) ?? ctx.uid,
      statut,
      ...(avant?.datePublication ? { datePublication: avant.datePublication } : {}),
      genereParIA: (avant?.genereParIA as boolean | undefined) ?? false,
      origine: (avant?.origine as string | undefined) ?? 'manuel',
      ...(avant?.postsReseaux ? { postsReseaux: avant.postsReseaux } : {}),
      seo,
      vues: (avant?.vues as number | undefined) ?? 0,
      creeLe: avant?.creeLe ?? maintenant,
      modifieLe: maintenant,
    });
    return { articleId: ref.id, slug, seo };
  });
}

export type ActionArticles =
  'publier' | 'planifier' | 'archiver' | 'brouillon' | 'corbeille' | 'restaurer';

/**
 * Actions sur un ou plusieurs articles (BLOG §5). Publier et planifier recalculent le contrôle
 * SEO avec les mentions du moment : un article avec un point bloquant est refusé (BLOG-04), les
 * autres passent.
 */
export async function agirSurArticles(
  s: ServicesBlog,
  ctx: ContexteSite,
  e: { ids: string[]; action: ActionArticles; date?: number },
): Promise<{ faits: string[]; refuses: { id: string; titre: string; raison: string }[] }> {
  const maintenant = s.horloge();
  if (e.action === 'planifier' && !(e.date && e.date > maintenant))
    throw new ErreurMetier('ENTREE_INVALIDE', 'Choisissez une date de publication à venir.');
  const mentions = await lireMentionsBlog(s.db, ctx.artisanId);
  const refs = [...new Set(e.ids)].map((id) => s.db.doc(chemins.articleBlog(ctx.artisanId, id)));
  return s.db.runTransaction(async (t) => {
    await exigerBlog(s, t, ctx);
    const docs = await t.getAll(...refs);
    const faits: string[] = [];
    const refuses: { id: string; titre: string; raison: string }[] = [];
    const ts = Timestamp.fromMillis(maintenant);
    for (const d of docs) {
      const a = d.data() as DocumentData | undefined;
      if (!a) continue;
      const titre = (a.titre as string) || 'Sans titre';
      if (a.supprimeLe && e.action !== 'restaurer') {
        refuses.push({ id: d.id, titre, raison: 'Dans la corbeille.' });
        continue;
      }
      let maj: Record<string, unknown>;
      if (e.action === 'publier' || e.action === 'planifier') {
        const seo = controleSeo(
          {
            titre: a.titre as string,
            meta: a.meta as string,
            motCle: a.motCle as string,
            corpsHtml: a.corpsHtml as string,
            image: a.image as { src: string; alt: string },
            categorieId: a.categorieId as string,
          },
          { mentionsCompletes: mentions.complet },
        );
        if (seo.bloquants.length) {
          refuses.push({
            id: d.id,
            titre,
            raison: `À corriger : ${seo.bloquants.map((b) => b.libelle.toLowerCase()).join(', ')}.`,
          });
          continue;
        }
        maj =
          e.action === 'publier'
            ? { statut: 'publie', datePublication: ts, seo }
            : { statut: 'planifie', datePublication: Timestamp.fromMillis(e.date!), seo };
      } else if (e.action === 'archiver') maj = { statut: 'archive' };
      else if (e.action === 'brouillon') maj = { statut: 'brouillon' };
      else if (e.action === 'corbeille') maj = { statut: 'brouillon', supprimeLe: ts };
      else maj = { supprimeLe: FieldValue.delete() };
      t.update(d.ref, { ...maj, modifieLe: ts });
      faits.push(d.id);
    }
    return { faits, refuses };
  });
}
