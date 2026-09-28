import { describe, expect, it } from 'vitest';
import { pagesDuSitemap, reglesRobots } from './indexation';

describe('SEO : sitemap et robots', () => {
  const pages = pagesDuSitemap(new Date('2026-09-28'));
  const chemins = pages.map((p) => new URL(p.url).pathname);
  it('accueil, landings, 11 communes, aide et 12 documents légaux ; adresses uniques', () => {
    expect(pages).toHaveLength(3 + 11 + 1 + 12);
    expect(new Set(chemins).size).toBe(pages.length);
    expect(chemins).toContain('/diagnostic-immobilier/cenon');
    expect(chemins).toContain('/legal/pro/securite');
  });
  it('aucune page privée dans le sitemap', () => {
    expect(chemins.filter((c) => /^\/(admin|api|mon-espace|pro\/)/.test(c))).toEqual([]);
  });
  it('production : espaces privés exclus, sitemap déclaré ; sinon tout est bloqué', () => {
    const r = reglesRobots(true);
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
    expect(r.rules).toEqual([
      expect.objectContaining({ disallow: expect.arrayContaining(['/admin', '/pro/']) }),
    ]);
    expect(reglesRobots(false).rules).toEqual([{ userAgent: '*', disallow: '/' }]);
  });
});
