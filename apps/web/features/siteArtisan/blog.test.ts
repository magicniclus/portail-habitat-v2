import { describe, expect, it } from 'vitest';
import {
  contenuArticle,
  contenuIndexBlog,
  jsonLdArticle,
  rendreCartesBlog,
  rssBlog,
  sitemapSite,
  type ArticleRendu,
} from './blog';

const art = (slug: string, cat = 'c1', p: Partial<ArticleRendu> = {}): ArticleRendu => ({
  slug,
  titre: `Article ${slug} <b>`,
  sousTitre: '',
  meta: `Résumé ${slug}`,
  image: { src: 'lib:r1/0', alt: 'Photo' },
  categorieId: cat,
  tags: ['t1'],
  datePublication: Date.UTC(2026, 9, 1, 8),
  modifieLe: Date.UTC(2026, 9, 2, 8),
  ...p,
});
const classement = {
  categories: [
    { id: 'c1', nom: 'Chauffage', slug: 'chauffage' },
    { id: 'c2', nom: 'Salle de bain', slug: 'salle-de-bain' },
  ],
  tags: [{ id: 't1', nom: 'Aides', slug: 'aides' }],
};
const media = (src: string) => (src === 'lib:r1/0' ? 'https://img/x.webp' : null);

describe('blog sur le site (BLOG §6, §7)', () => {
  it('élément « Articles du blog » : catégorie filtrée, nombre limité, textes échappés (BLOG-06)', () => {
    const h = rendreCartesBlog(
      [art('a'), art('b', 'c2'), art('c'), art('d')],
      { affichage: 'grille', nb: 2, cat: 'c1', extrait: true },
      { media, classement, classe: 'el' },
    );
    expect(h).toContain('class="el blog grille"');
    expect(h.match(/class="billet"/g)).toHaveLength(2);
    expect(h).toContain('href="/blog/a"');
    expect(h).not.toContain('href="/blog/b"');
    expect(h).toContain('Article a &lt;b&gt;');
    expect(h).toContain('Résumé a');
    expect(
      rendreCartesBlog(
        [art('a')],
        { affichage: 'liste', nb: 3, cat: '', extrait: false },
        { media, classement, classe: '' },
      ),
    ).not.toContain('Résumé a');
    expect(
      rendreCartesBlog(
        [],
        { affichage: 'une', nb: 3, cat: '', extrait: true },
        { media, classement, classe: '' },
      ),
    ).toBe('');
  });

  it('index et catégorie : onglets dans l’ordre, onglet courant marqué', () => {
    const h = contenuIndexBlog([art('a'), art('b', 'c2')], classement, {
      media,
      titre: 'Chauffage',
      actuelle: 'c1',
    });
    expect(h.indexOf('Chauffage</a>')).toBeLessThan(h.indexOf('Salle de bain</a>'));
    expect(h).toContain('href="/blog/categorie/chauffage" aria-current="page"');
    expect(h).toContain('href="/blog/a"');
    expect(h).not.toContain('href="/blog/b"');
    expect(contenuIndexBlog([], classement, { media, titre: 'Blog' })).toContain('Aucun article');
  });

  it('article : corps, catégorie, tags et mentions légales sous l’article (BLOG-05)', () => {
    const h = contenuArticle(
      { ...art('a'), corpsHtml: '<p>Corps</p>', auteur: 'Jean' },
      {
        media,
        classement,
        mentions: [
          { cle: 'decennale', libelle: 'Assurance décennale', texte: 'SMABTP, contrat D-1' },
        ],
      },
    );
    expect(h).toContain('<div class="corps"><p>Corps</p></div>');
    expect(h).toContain('href="/blog/categorie/chauffage"');
    expect(h).toContain('href="/blog/tag/aides"');
    expect(h).toContain('<strong>Assurance décennale</strong> · SMABTP, contrat D-1');
    expect(h).toContain('Jean');
  });

  it('BlogPosting lié à l’entreprise ; RSS ; plan du site sans les tags', () => {
    expect(
      jsonLdArticle(art('a'), { hote: 'x.fr', entreprise: 'Durand', image: null }),
    ).toMatchObject({
      '@type': 'BlogPosting',
      url: 'https://x.fr/blog/a',
      publisher: { name: 'Durand' },
      author: { '@type': 'Organization' },
    });
    const rss = rssBlog('x.fr', 'Durand & fils', [art('a')]);
    expect(rss).toContain('<link>https://x.fr/blog/a</link>');
    expect(rss).toContain('Durand &amp; fils');
    const plan = sitemapSite('x.fr', ['', 'contact-devis'], [art('a')], classement);
    expect(plan).toContain('<loc>https://x.fr/blog/a</loc><lastmod>2026-10-02</lastmod>');
    expect(plan).toContain('https://x.fr/blog/categorie/chauffage');
    expect(plan).not.toContain('salle-de-bain');
    expect(plan).not.toContain('/tag/');
    expect(sitemapSite('x.fr', [''], [], classement)).not.toContain('/blog');
  });
});
