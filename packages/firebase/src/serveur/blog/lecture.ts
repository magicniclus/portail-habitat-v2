import type { StatutArticle } from '@ph/core/blog';
import type { Firestore, Timestamp } from 'firebase-admin/firestore';
import { chemins } from '../../chemins';

const ms = (t: unknown) => (t ? (t as Timestamp).toMillis() : undefined);

export interface ArticleListe {
  id: string;
  titre: string;
  slug: string;
  statut: StatutArticle;
  categorieId: string;
  tags: string[];
  datePublication?: number;
  modifieLe: number;
  vues: number;
  auteurUid: string;
  genereParIA: boolean;
  bloquants: number;
  supprimeLe?: number;
}

/** Liste de l'onglet Blog (BLOG §5), corbeille comprise ; plus récents d'abord. */
export async function listerArticles(db: Firestore, artisanId: string): Promise<ArticleListe[]> {
  const r = await db
    .collection(chemins.articlesBlog(artisanId))
    .select(
      'titre',
      'slug',
      'statut',
      'categorieId',
      'tags',
      'datePublication',
      'modifieLe',
      'vues',
      'auteurUid',
      'genereParIA',
      'seo',
      'supprimeLe',
    )
    .orderBy('modifieLe', 'desc')
    .limit(500)
    .get();
  return r.docs.map((d) => {
    const a = d.data();
    return {
      id: d.id,
      titre: a.titre as string,
      slug: a.slug as string,
      statut: a.statut as StatutArticle,
      categorieId: a.categorieId as string,
      tags: (a.tags as string[]) ?? [],
      ...(a.datePublication ? { datePublication: ms(a.datePublication)! } : {}),
      modifieLe: ms(a.modifieLe)!,
      vues: (a.vues as number) ?? 0,
      auteurUid: a.auteurUid as string,
      genereParIA: Boolean(a.genereParIA),
      bloquants: ((a.seo?.bloquants as unknown[]) ?? []).length,
      ...(a.supprimeLe ? { supprimeLe: ms(a.supprimeLe)! } : {}),
    };
  });
}

export interface ArticleComplet {
  id: string;
  titre: string;
  sousTitre: string;
  slug: string;
  slugAuto: boolean;
  corpsHtml: string;
  image: { src: string; alt: string };
  meta: string;
  motCle: string;
  motsSecondaires: string[];
  categorieId: string;
  tags: string[];
  auteurUid: string;
  statut: StatutArticle;
  datePublication?: number;
  genereParIA: boolean;
  postsReseaux?: Record<string, unknown>;
}

function complet(id: string, a: FirebaseFirestore.DocumentData): ArticleComplet {
  return {
    id,
    titre: a.titre,
    sousTitre: a.sousTitre,
    slug: a.slug,
    slugAuto: a.slugAuto,
    corpsHtml: a.corpsHtml,
    image: a.image,
    meta: a.meta,
    motCle: a.motCle,
    motsSecondaires: a.motsSecondaires ?? [],
    categorieId: a.categorieId,
    tags: a.tags ?? [],
    auteurUid: a.auteurUid,
    statut: a.statut,
    ...(a.datePublication ? { datePublication: ms(a.datePublication)! } : {}),
    genereParIA: Boolean(a.genereParIA),
    ...(a.postsReseaux ? { postsReseaux: a.postsReseaux } : {}),
  };
}

export async function lireArticle(
  db: Firestore,
  artisanId: string,
  articleId: string,
): Promise<ArticleComplet | null> {
  const d = await db.doc(chemins.articleBlog(artisanId, articleId)).get();
  return d.exists ? complet(d.id, d.data()!) : null;
}

export interface Classement {
  categories: { id: string; nom: string; slug: string; ordre: number }[];
  tags: { id: string; nom: string; slug: string }[];
}

export async function lireClassement(db: Firestore, artisanId: string): Promise<Classement> {
  const [c, t] = await Promise.all([
    db.collection(chemins.categoriesBlog(artisanId)).orderBy('ordre').get(),
    db.collection(chemins.tagsBlog(artisanId)).orderBy('nom').get(),
  ]);
  return {
    categories: c.docs.map((d) => ({
      id: d.id,
      nom: d.get('nom') as string,
      slug: d.get('slug') as string,
      ordre: d.get('ordre') as number,
    })),
    tags: t.docs.map((d) => ({
      id: d.id,
      nom: d.get('nom') as string,
      slug: d.get('slug') as string,
    })),
  };
}

/**
 * Articles publiés d'un site (élément « Articles du blog », pages du blog) : une requête, pas
 * une copie (BLOG-06), toujours limitée au site demandé (BLOG-07).
 */
export async function articlesPublies(
  db: Firestore,
  artisanId: string,
  o: { categorieId?: string; limite: number },
): Promise<ArticleComplet[]> {
  let q = db.collection(chemins.articlesBlog(artisanId)).where('statut', '==', 'publie');
  if (o.categorieId) q = q.where('categorieId', '==', o.categorieId);
  const r = await q.orderBy('datePublication', 'desc').limit(o.limite).get();
  return r.docs.map((d) => complet(d.id, d.data()));
}

/** Article publié par son adresse ; ancienne adresse → `redirection` (301, BLOG §7). */
export async function articleParAdresse(
  db: Firestore,
  artisanId: string,
  slug: string,
): Promise<{ article: ArticleComplet } | { redirection: string } | null> {
  const col = db.collection(chemins.articlesBlog(artisanId));
  const r = await col.where('statut', '==', 'publie').where('slug', '==', slug).limit(1).get();
  if (!r.empty) return { article: complet(r.docs[0]!.id, r.docs[0]!.data()) };
  const ancien = await col
    .where('statut', '==', 'publie')
    .where('anciensSlugs', 'array-contains', slug)
    .limit(1)
    .get();
  return ancien.empty ? null : { redirection: ancien.docs[0]!.get('slug') as string };
}

/** Auteurs possibles : membres de l'équipe, par leur nom affiché (jamais d'adresse email). */
export async function auteursBlog(
  db: Firestore,
  artisanId: string,
): Promise<{ uid: string; nom: string }[]> {
  const membres = await db.collection(chemins.membres(artisanId)).get();
  if (!membres.size) return [];
  const users = await db.getAll(...membres.docs.map((m) => db.doc(chemins.user(m.id))));
  return membres.docs
    .map((m, i) => ({
      uid: m.id,
      nom: (users[i]?.get('nomAffiche') as string | undefined) || 'Membre de l’équipe',
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
