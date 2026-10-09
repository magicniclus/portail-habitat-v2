import { describe, expect, it } from 'vitest';
import {
  COMMUNES,
  communeParSlug,
  descriptionCommune,
  risquesCourts,
  titreCommune,
} from './communes';

describe('pages communes du diagnostic (DIA-05)', () => {
  it('11 communes, slugs uniques', () => {
    expect(COMMUNES).toHaveLength(11);
    expect(new Set(COMMUNES.map((c) => c.slug)).size).toBe(11);
  });
  it('titre unique par commune, 70 caractères au plus ; description ≤ 170', () => {
    const titres = COMMUNES.map(titreCommune);
    expect(new Set(titres).size).toBe(11);
    for (const c of COMMUNES) {
      expect(titreCommune(c).length).toBeLessThanOrEqual(70);
      expect(descriptionCommune(c).length).toBeLessThanOrEqual(170);
      expect(c.intro.length).toBeGreaterThan(80);
      expect(c.frequents.length).toBeGreaterThan(0);
    }
  });
  it('recherche et risques de la Presqu’île', () => {
    expect(communeParSlug('cenon')?.cp).toBe('33150');
    expect(communeParSlug('bordeaux')).toBeUndefined();
    expect(risquesCourts('ambes')).toMatch(/Presqu'île/);
    expect(risquesCourts('cenon')).toMatch(/argiles/);
  });
});
