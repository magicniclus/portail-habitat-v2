import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import {
  auteursBlog,
  lireArticle,
  lireClassement,
  lireCreditsBlog,
  lireMentionsBlog,
  lirePilote,
  listerArticles,
} from '@ph/firebase/blog';
import { lireSiteEdition } from '@ph/firebase/sites';
import { getFirestore } from 'firebase-admin/firestore';
import { DOMAINE_BASE, mediasDuSite } from './sites';

const db = () => getFirestore(appAdmin());

async function hoteDuSite(artisanId: string): Promise<string> {
  const site = await lireSiteEdition(db(), artisanId);
  return `${site.sousDomaine ?? 'monsite'}.${DOMAINE_BASE}`;
}

/** Onglet Blog de Mon site (BLOG §5) : liste, classement, auteurs, crédits IA, mentions. */
export async function ongletBlog(artisanId: string) {
  const [articles, classement, auteurs, credits, mentions, hote, pilote] = await Promise.all([
    listerArticles(db(), artisanId),
    lireClassement(db(), artisanId),
    auteursBlog(db(), artisanId),
    lireCreditsBlog({ db: db(), horloge: Date.now }, artisanId),
    lireMentionsBlog(db(), artisanId),
    hoteDuSite(artisanId),
    lirePilote({ db: db(), horloge: Date.now }, artisanId),
  ]);
  return {
    articles,
    classement,
    auteurs,
    credits,
    mentionsCompletes: mentions.complet,
    hote,
    pilote,
  };
}
export type OngletBlogDonnees = Awaited<ReturnType<typeof ongletBlog>>;

/** Éditeur d'article (BLOG §3) : article, classement, auteurs, mentions, médias, cibles de lien. */
export async function editeurArticle(artisanId: string, articleId?: string) {
  const [article, classement, auteurs, mentions, medias, site, credits, articles] =
    await Promise.all([
      articleId ? lireArticle(db(), artisanId, articleId) : null,
      lireClassement(db(), artisanId),
      auteursBlog(db(), artisanId),
      lireMentionsBlog(db(), artisanId),
      mediasDuSite(artisanId),
      lireSiteEdition(db(), artisanId),
      lireCreditsBlog({ db: db(), horloge: Date.now }, artisanId),
      listerArticles(db(), artisanId),
    ]);
  const liens = [
    ...Object.values(site.pages)
      .filter((p) => p.statut === 'publiee')
      .map((p) => ({ libelle: p.nom, href: `/${p.slug}` })),
    ...articles
      .filter((a) => a.statut === 'publie' && a.id !== articleId)
      .map((a) => ({ libelle: a.titre, href: `/blog/${a.slug}` })),
  ];
  return {
    article,
    classement,
    auteurs,
    mentions,
    medias,
    liens,
    credits,
    hote: `${site.sousDomaine ?? 'monsite'}.${DOMAINE_BASE}`,
  };
}
export type EditeurArticleDonnees = Awaited<ReturnType<typeof editeurArticle>>;
