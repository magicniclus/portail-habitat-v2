import type { LigneMention } from '@ph/core/blog';
import { formatDate } from '@ph/core/format';
import { esc } from './html';

/** Article publié tel que le rendu public le reçoit (sans le corps pour les listes). */
export interface ArticleRendu {
  slug: string;
  titre: string;
  sousTitre: string;
  meta: string;
  image: { src: string; alt: string };
  categorieId: string;
  tags: string[];
  datePublication: number;
  modifieLe: number;
}

export interface ClassementRendu {
  categories: { id: string; nom: string; slug: string }[];
  tags: { id: string; nom: string; slug: string }[];
}

/** Styles du blog, ajoutés à la feuille du site (couleurs, police et arrondis du thème). */
export const STYLE_BLOG = `.blog{display:grid;gap:24px}.blog.grille{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.blog.liste .billet,.blog.une .billet:first-child{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:20px;align-items:center}
.billet{display:grid;gap:10px;color:inherit;text-decoration:none}.billet img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:var(--rayon)}.billet h3{font-size:22px}.billet .info{font-size:14px;opacity:.75}.billet p{font-size:16px}
@media(max-width:700px){.blog.liste .billet,.blog.une .billet:first-child{grid-template-columns:1fr}}
.article{max-width:760px;margin:0 auto;padding:48px 20px;display:grid;gap:20px}.article h1{font-size:clamp(32px,5vw,48px)}.article .chapo{font-size:20px}.article .corps{display:grid;gap:16px;font-size:18px}.article .corps h2{font-size:28px;margin-top:12px}.article .corps h3{font-size:22px}.article .corps blockquote{border-left:4px solid var(--accent);margin:0;padding-left:16px}.article .corps a{color:var(--primaire)}
.onglets{display:flex;flex-wrap:wrap;gap:8px}.onglets a{padding:10px 16px;border-radius:999px;border:1px solid rgba(0,0,0,.15);color:inherit;text-decoration:none;min-height:44px}.onglets a[aria-current]{background:var(--primaire);color:white;border-color:var(--primaire)}
.legales{font-size:14px;opacity:.85;border-top:1px solid rgba(0,0,0,.1);padding-top:16px;display:grid;gap:4px}.blog-page{max-width:1200px;margin:0 auto;padding:48px 20px;display:grid;gap:24px}`;

type Media = (src: string) => string | null;

const date = (ms: number) => formatDate(ms, 'long');

function carte(a: ArticleRendu, media: Media, extrait: boolean, cat?: string): string {
  const img = a.image.src ? media(a.image.src) : null;
  return `<a class="billet" href="/blog/${esc(a.slug)}">${img ? `<img src="${esc(img)}" alt="${esc(a.image.alt)}" loading="lazy">` : ''}<span><span class="info">${[cat, date(a.datePublication)].filter(Boolean).map(esc).join(' · ')}</span><h3>${esc(a.titre)}</h3>${extrait && a.meta ? `<p>${esc(a.meta)}</p>` : ''}</span></a>`;
}

/**
 * Élément « Articles du blog » (BLOG §6) : une requête, pas une copie (BLOG-06) ; grille
 * responsive (cartes de 240 px minimum), liste ou « à la une ».
 */
export function rendreCartesBlog(
  articles: readonly ArticleRendu[],
  p: { affichage: 'grille' | 'liste' | 'une'; nb: number; cat: string; extrait: boolean },
  o: { media: Media; classement: ClassementRendu; classe: string },
): string {
  const liste = articles.filter((a) => !p.cat || a.categorieId === p.cat).slice(0, p.nb);
  if (!liste.length) return '';
  const nomCat = (id: string) => o.classement.categories.find((c) => c.id === id)?.nom;
  return `<div class="${o.classe} blog ${p.affichage}">${liste.map((a) => carte(a, o.media, p.extrait, nomCat(a.categorieId))).join('')}</div>`;
}

/** Page « Blog » ou catégorie : onglets des catégories (dans leur ordre) puis les articles. */
export function contenuIndexBlog(
  articles: readonly ArticleRendu[],
  classement: ClassementRendu,
  o: { media: Media; titre: string; actuelle?: string; tag?: string },
): string {
  const onglets = classement.categories.length
    ? `<nav class="onglets" aria-label="Catégories"><a href="/blog"${!o.actuelle ? ' aria-current="page"' : ''}>Tous</a>${classement.categories
        .map(
          (c) =>
            `<a href="/blog/categorie/${esc(c.slug)}"${o.actuelle === c.id ? ' aria-current="page"' : ''}>${esc(c.nom)}</a>`,
        )
        .join('')}</nav>`
    : '';
  const liste = articles.filter(
    (a) => (!o.actuelle || a.categorieId === o.actuelle) && (!o.tag || a.tags.includes(o.tag)),
  );
  const cartes = liste.length
    ? rendreCartesBlog(
        liste,
        { affichage: 'grille', nb: 60, cat: '', extrait: true },
        {
          media: o.media,
          classement,
          classe: '',
        },
      )
    : '<p>Aucun article pour le moment.</p>';
  return `<div class="blog-page"><h1>${esc(o.titre)}</h1>${onglets}${cartes}</div>`;
}

/** Page d'un article : en-tête, corps (déjà assaini à l'enregistrement), mentions lues en direct. */
export function contenuArticle(
  a: ArticleRendu & { corpsHtml: string; auteur?: string },
  o: { media: Media; classement: ClassementRendu; mentions: LigneMention[] },
): string {
  const img = a.image.src ? o.media(a.image.src) : null;
  const cat = o.classement.categories.find((c) => c.id === a.categorieId);
  const tags = a.tags
    .map((t) => o.classement.tags.find((x) => x.id === t))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  return `<article class="article"><p class="info">${cat ? `<a href="/blog/categorie/${esc(cat.slug)}">${esc(cat.nom)}</a> · ` : ''}${esc(date(a.datePublication))}${a.auteur ? ` · ${esc(a.auteur)}` : ''}</p><h1>${esc(a.titre)}</h1>${a.sousTitre ? `<p class="chapo">${esc(a.sousTitre)}</p>` : ''}${img ? `<img src="${esc(img)}" alt="${esc(a.image.alt)}">` : ''}<div class="corps">${a.corpsHtml}</div>${tags.length ? `<p class="onglets">${tags.map((t) => `<a href="/blog/tag/${esc(t.slug)}">${esc(t.nom)}</a>`).join('')}</p>` : ''}<footer class="legales">${o.mentions.map((m) => `<p><strong>${esc(m.libelle)}</strong> · ${esc(m.texte)}</p>`).join('')}</footer></article>`;
}

/** Données structurées `BlogPosting` liées à l'entreprise (BLOG §7). */
export function jsonLdArticle(
  a: ArticleRendu & { auteur?: string },
  o: { hote: string; entreprise: string; image: string | null },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.titre,
    description: a.meta,
    datePublished: new Date(a.datePublication).toISOString(),
    dateModified: new Date(a.modifieLe).toISOString(),
    url: `https://${o.hote}/blog/${a.slug}`,
    ...(o.image ? { image: o.image } : {}),
    author: a.auteur
      ? { '@type': 'Person', name: a.auteur }
      : { '@type': 'Organization', name: o.entreprise },
    publisher: { '@type': 'LocalBusiness', name: o.entreprise, url: `https://${o.hote}/` },
  };
}

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Flux RSS `/blog/rss.xml` (BLOG §7). */
export function rssBlog(hote: string, nom: string, articles: readonly ArticleRendu[]): string {
  const items = articles
    .slice(0, 30)
    .map(
      (a) =>
        `<item><title>${xml(a.titre)}</title><link>https://${hote}/blog/${xml(a.slug)}</link><guid>https://${hote}/blog/${xml(a.slug)}</guid><pubDate>${new Date(a.datePublication).toUTCString()}</pubDate><description>${xml(a.meta)}</description></item>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(`Blog · ${nom}`)}</title><link>https://${hote}/blog</link><description>${xml(`Conseils et chantiers de ${nom}`)}</description><language>fr</language>${items}</channel></rss>`;
}

/** Plan du site : pages publiées, blog, catégories et articles (tags exclus : `noindex`). */
export function sitemapSite(
  hote: string,
  pages: readonly string[],
  articles: readonly ArticleRendu[],
  classement: ClassementRendu,
): string {
  const url = (chemin: string, lastmod?: number) =>
    `<url><loc>https://${hote}/${xml(chemin)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
  const blog = articles.length
    ? [
        url('blog'),
        ...classement.categories
          .filter((c) => articles.some((a) => a.categorieId === c.id))
          .map((c) => url(`blog/categorie/${c.slug}`)),
        ...articles.map((a) => url(`blog/${a.slug}`, a.modifieLe)),
      ]
    : [];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages.map((p) => url(p)), ...blog].join('')}</urlset>`;
}
