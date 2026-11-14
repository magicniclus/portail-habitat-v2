import {
  completerLiensInternes,
  controleSeo,
  corrigerSeoAuto,
  dateSelonTendance,
  motCleDejaUtilise,
  type ControleSeo,
  type StatutArticle,
} from '@ph/core/blog';
import { ErreurMetier } from '@ph/core/erreurs';
import type { DocumentData } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';
import type { ContexteSite } from '../sites/edition';
import { lirePhotosPubliees } from '../sites/lecture';
import { agirSurArticles, enregistrerArticle } from './articles';
import { gererCategorie } from './classement';
import { demanderIaBlog, type ServicesIaBlog } from './ia';
import { lireClassement } from './lecture';

const VIDE = { titre: '', meta: '', motCle: '', corps: '' };

/** Mots-clés principaux déjà pris par les articles (hors corbeille). */
export async function motsClesUtilises(s: ServicesIaBlog, artisanId: string): Promise<string[]> {
  const r = await s.db
    .collection(chemins.articlesBlog(artisanId))
    .select('motCle', 'supprimeLe')
    .get();
  return r.docs
    .filter((d) => !d.get('supprimeLe'))
    .map((d) => (d.get('motCle') as string | undefined) ?? '')
    .filter(Boolean);
}

/** Idées de l'IA (gratuites, BLOG-03) dont le mot-clé n'est ni pris ni écarté. */
export async function ideesLibres(
  s: ServicesIaBlog,
  ctx: ContexteSite,
  ecartes: readonly string[],
): Promise<{ titre: string; motCle: string }[]> {
  const { categories } = await lireClassement(s.db, ctx.artisanId);
  const r = await demanderIaBlog(s, ctx, {
    action: 'idees',
    article: VIDE,
    categories: categories.map((c) => c.nom),
  });
  if (r.action !== 'idees') return [];
  const vus: string[] = [...ecartes];
  return r.sortie.idees.filter((i) => {
    if (!i.motCle.trim() || motCleDejaUtilise(i.motCle, vus)) return false;
    vus.push(i.motCle);
    return true;
  });
}

/** Pages publiées du site et articles en ligne : cibles des liens internes. */
async function ciblesLiens(s: ServicesIaBlog, artisanId: string) {
  const [pages, articles] = await Promise.all([
    s.db.collection(chemins.pagesSite(artisanId)).get(),
    s.db
      .collection(chemins.articlesBlog(artisanId))
      .where('statut', '==', 'publie')
      .select('slug', 'titre')
      .limit(10)
      .get(),
  ]);
  return [
    ...articles.docs.map((d) => ({
      url: `/blog/${d.get('slug') as string}`,
      titre: d.get('titre') as string,
    })),
    ...pages.docs
      .filter((d) => d.get('statut') === 'publiee' && d.get('type') !== 'mentions')
      .sort((a, b) => ((a.get('ordre') as number) ?? 0) - ((b.get('ordre') as number) ?? 0))
      .map((d) => ({
        url: `/${(d.get('slug') as string | undefined) ?? ''}`,
        titre: d.get('nom') as string,
      })),
  ];
}

/** Retouche gratuite facultative : un échec n'empêche pas l'article d'être créé. */
async function retouche<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch {
    return null;
  }
}

export interface ArticleAutonome {
  articleId: string;
  statut: StatutArticle;
  datePublication: number | null;
  seo: ControleSeo;
  motCle: string;
}

/**
 * « Tout faire en un clic » (BLOG §2 bis) : mot-clé libre (idées de l'IA si pas de sujet),
 * rédaction (un crédit), catégorie, photo des réalisations + texte alternatif, liens internes,
 * corrections SEO automatiques, textes réseaux. Fin « relire » : brouillon ; « planifier » :
 * planifié à la date conseillée si aucun point bloquant ne reste. Jamais publié directement (D70).
 */
export async function articleEnUnClic(
  s: ServicesIaBlog,
  ctx: ContexteSite,
  e: { sujet?: string; fin: 'relire' | 'planifier' },
): Promise<ArticleAutonome> {
  const [pris, classement] = await Promise.all([
    motsClesUtilises(s, ctx.artisanId),
    lireClassement(s.db, ctx.artisanId),
  ]);
  const categories = classement.categories.map((c) => c.nom);
  let sujet = e.sujet?.trim();
  if (!sujet) {
    const [idee] = await ideesLibres(s, ctx, pris);
    if (!idee)
      throw new ErreurMetier('INDISPONIBLE', 'Aucun nouveau sujet trouvé. Indiquez un sujet.');
    sujet = `${idee.titre} (mot-clé principal : ${idee.motCle})`;
  }
  const r = await demanderIaBlog(s, ctx, {
    action: 'rediger',
    sujet,
    type: 'Conseils',
    longueur: 'moyen',
    chantiers: true,
    article: VIDE,
    categories,
  });
  if (r.action !== 'rediger') throw new ErreurMetier('INDISPONIBLE');
  const a = r.sortie;
  const article = { titre: a.titre, meta: a.meta, motCle: a.motCle, corps: a.corpsHtml };

  const [classe, photos, cibles] = await Promise.all([
    retouche(() => demanderIaBlog(s, ctx, { action: 'classement', article, categories })),
    lirePhotosPubliees(s.db, ctx.artisanId),
    ciblesLiens(s, ctx.artisanId),
  ]);
  const nomCategorie = classe?.action === 'classement' ? classe.sortie.categorie.trim() : '';
  let categorieId =
    classement.categories.find((c) => c.nom.toLowerCase() === nomCategorie.toLowerCase())?.id ??
    classement.categories[0]?.id;
  if (!categorieId)
    categorieId = (await gererCategorie(s, ctx, { action: 'creer', nom: 'Conseils' })).id!;
  const tags =
    classe?.action === 'classement'
      ? classement.tags
          .filter((t) => classe.sortie.tags.some((x) => x.toLowerCase() === t.nom.toLowerCase()))
          .map((t) => t.id)
      : [];
  const avecPhotos = photos.filter((p) => p.urls.length);
  const photo = avecPhotos.length ? avecPhotos[pris.length % avecPhotos.length]! : null;
  const src = photo ? `lib:${photo.id}/0` : '';
  const alt = src
    ? await retouche(() => demanderIaBlog(s, ctx, { action: 'alt', article, categories }))
    : null;

  const corrige = corrigerSeoAuto({
    titre: a.titre,
    sousTitre: a.sousTitre,
    meta: a.meta,
    motCle: a.motCle,
    corpsHtml: completerLiensInternes(a.corpsHtml, cibles),
    image: { src, alt: alt?.action === 'alt' ? (alt.sortie.propositions[0] ?? '') : '' },
    categorieId,
  });
  const { articleId, seo } = await enregistrerArticle(s, ctx, {
    ...corrige,
    motsSecondaires: [],
    tags,
    genereParIA: true,
  });
  const reseaux = await retouche(() =>
    demanderIaBlog(s, ctx, {
      action: 'reseaux',
      article: { ...article, titre: corrige.titre, meta: corrige.meta },
      categories,
    }),
  );
  if (reseaux?.action === 'reseaux')
    await s.db.doc(chemins.articleBlog(ctx.artisanId, articleId)).update({
      postsReseaux: reseaux.sortie,
    });

  if (e.fin === 'planifier' && !seo.bloquants.length) {
    // Volumes de recherche (DataForSEO, D68) pas encore branchés : date de repli.
    const date = dateSelonTendance(null, s.horloge());
    await agirSurArticles(s, ctx, { ids: [articleId], action: 'planifier', date });
    return { articleId, statut: 'planifie', datePublication: date, seo, motCle: corrige.motCle };
  }
  return { articleId, statut: 'brouillon', datePublication: null, seo, motCle: corrige.motCle };
}

/** Contrôle SEO d'un article lu en base, avec les mentions du moment. */
export const seoDe = (a: DocumentData, mentionsCompletes: boolean) =>
  controleSeo(
    {
      titre: a.titre as string,
      meta: a.meta as string,
      motCle: a.motCle as string,
      corpsHtml: a.corpsHtml as string,
      image: a.image as { src: string; alt: string },
      categorieId: a.categorieId as string,
    },
    { mentionsCompletes },
  );
