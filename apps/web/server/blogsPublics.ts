import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import { articleParAdresse, auteursBlog, blogPublic, lireMentionsBlog } from '@ph/firebase/blog';
import { getFirestore } from 'firebase-admin/firestore';
import {
  contenuArticle,
  contenuIndexBlog,
  jsonLdArticle,
  rssBlog,
  sitemapSite,
  type ArticleRendu,
  type ClassementRendu,
} from '@/features/siteArtisan/blog';
import { rendreDocument } from '@/features/siteArtisan/document';
import { resoudreMedia, type SiteServi } from './sitesPublics';

const db = () => getFirestore(appAdmin());

/** 30 s de cache par instance, comme le site : un article publié apparaît en moins d'une minute. */
const CACHE_MS = 30_000;
const cache = new Map<string, { blog: BlogServi; lu: number }>();
export interface BlogServi {
  articles: ArticleRendu[];
  classement: ClassementRendu;
}

export async function blogServi(siteId: string, maintenant = Date.now()): Promise<BlogServi> {
  const c = cache.get(siteId);
  if (c && maintenant - c.lu < CACHE_MS) return c.blog;
  const blog = await blogPublic(db(), siteId);
  cache.set(siteId, { blog, lu: maintenant });
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return blog;
}

const ENTETES_HTML = 'text/html; charset=utf-8';
const CACHE = 'public, s-maxage=30, stale-while-revalidate=60';
const reponse = (corps: string, type: string, status = 200) =>
  new Response(corps, { status, headers: { 'Content-Type': type, 'Cache-Control': CACHE } });

/** Document complet d'une page du blog, avec la navigation, le thème et le pied du site. */
function document(
  site: SiteServi,
  blog: BlogServi,
  p: {
    slug: string;
    titre: string;
    meta: string;
    contenu: string;
    jsonLd?: object;
    noindex?: boolean;
  },
): string {
  return rendreDocument(
    {
      hote: site.canonique,
      offre: site.offre,
      theme: site.theme,
      navigation: site.navigation,
      page: {
        slug: p.slug,
        nom: p.titre,
        seo: { title: p.titre.slice(0, 120), meta: p.meta.slice(0, 320), motCle: '' },
        sections: [],
        sansNavigation: false,
      },
      pages: site.pages,
      nomEntreprise: site.nomEntreprise,
      ...(site.urlFiche ? { urlFiche: site.urlFiche } : {}),
      contenu: p.contenu,
      ...(p.jsonLd ? { jsonLd: p.jsonLd } : {}),
      ...(p.noindex ? { noindex: true } : {}),
    },
    { pages: site.pages, media: resoudreMedia(site), champs: site.champs, blog },
  );
}

/**
 * Pages du blog d'un site (BLOG §7) : `/blog`, `/blog/{slug}` (ancienne adresse → 301),
 * `/blog/categorie/{slug}`, `/blog/tag/{slug}` (`noindex`), `/blog/rss.xml`. `null` : introuvable.
 */
export async function pageBlog(site: SiteServi, segments: string[]): Promise<Response | null> {
  const blog = await blogServi(site.siteId);
  const media = resoudreMedia(site);
  const [a, b] = segments;
  if (!a)
    return reponse(
      document(site, blog, {
        slug: 'blog',
        titre: `Blog | ${site.nomEntreprise}`,
        meta: `Conseils, chantiers et actualités de ${site.nomEntreprise}.`,
        contenu: contenuIndexBlog(blog.articles, blog.classement, { media, titre: 'Blog' }),
      }),
      ENTETES_HTML,
    );
  if (a === 'rss.xml' && !b)
    return reponse(
      rssBlog(site.canonique, site.nomEntreprise, blog.articles),
      'application/rss+xml; charset=utf-8',
    );
  if ((a === 'categorie' || a === 'tag') && b) {
    const liste = a === 'categorie' ? blog.classement.categories : blog.classement.tags;
    const x = liste.find((c) => c.slug === b);
    if (!x) return null;
    return reponse(
      document(site, blog, {
        slug: `blog/${a}/${x.slug}`,
        titre: `${x.nom} | Blog ${site.nomEntreprise}`,
        meta: `Articles « ${x.nom} » de ${site.nomEntreprise}.`,
        contenu: contenuIndexBlog(blog.articles, blog.classement, {
          media,
          titre: x.nom,
          ...(a === 'categorie' ? { actuelle: x.id } : { tag: x.id }),
        }),
        ...(a === 'tag' ? { noindex: true } : {}),
      }),
      ENTETES_HTML,
    );
  }
  if (b) return null;
  const r = await articleParAdresse(db(), site.siteId, a);
  if (!r) return null;
  if ('redirection' in r)
    return new Response(null, {
      status: 301,
      headers: {
        Location: `/blog/${encodeURIComponent(r.redirection)}`,
        'Cache-Control': 'public, s-maxage=300',
      },
    });
  // Mentions lues en direct dans Devis & factures (BLOG-05) ; auteur par son nom affiché.
  const [mentions, auteurs] = await Promise.all([
    lireMentionsBlog(db(), site.siteId),
    auteursBlog(db(), site.siteId),
  ]);
  const art = r.article;
  const auteur = auteurs.find((x) => x.uid === art.auteurUid)?.nom;
  const resume = blog.articles.find((x) => x.slug === art.slug);
  const rendu = {
    ...art,
    datePublication: art.datePublication ?? Date.now(),
    modifieLe: resume?.modifieLe ?? art.datePublication ?? Date.now(),
    ...(auteur ? { auteur } : {}),
  };
  return reponse(
    document(site, blog, {
      slug: `blog/${art.slug}`,
      titre: art.titre,
      meta: art.meta,
      contenu: contenuArticle(rendu, {
        media,
        classement: blog.classement,
        mentions: mentions.lignes,
      }),
      jsonLd: jsonLdArticle(rendu, {
        hote: site.canonique,
        entreprise: site.nomEntreprise,
        image: art.image.src ? media(art.image.src) : null,
      }),
    }),
    ENTETES_HTML,
  );
}

/** `/sitemap.xml` et `/robots.txt` du site de l'artisan. */
export async function fichierSite(site: SiteServi, nom: string): Promise<Response | null> {
  if (nom === 'robots.txt')
    return reponse(
      `User-agent: *\nAllow: /\nSitemap: https://${site.canonique}/sitemap.xml\n`,
      'text/plain; charset=utf-8',
    );
  if (nom !== 'sitemap.xml') return null;
  const blog = await blogServi(site.siteId);
  const pages = Object.values(site.pages).map((p) => p.slug);
  return reponse(
    sitemapSite(site.canonique, pages, blog.articles, blog.classement),
    'application/xml; charset=utf-8',
  );
}
