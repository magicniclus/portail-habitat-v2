import { describe, expect, it } from 'vitest';
import { annoncesVisibles, minuitParis } from './annonces';

const a = (
  id: string,
  p: Partial<{
    cible: 'pros' | 'particuliers' | 'tous';
    actif: boolean;
    debut: number;
    fin: number;
  }> = {},
) => ({
  id,
  titre: id,
  texte: '',
  ton: 'info' as const,
  cible: p.cible ?? 'tous',
  actif: p.actif ?? true,
  debut: p.debut ?? 0,
  ...(p.fin !== undefined ? { fin: p.fin } : {}),
});

describe('annonces (ADMIN §2.11)', () => {
  it('actives, commencées, pas finies, pour ce public ; les plus récentes d’abord', () => {
    const liste = [
      a('tous'),
      a('pros', { cible: 'pros', debut: 50 }),
      a('part', { cible: 'particuliers' }),
      a('futur', { debut: 200 }),
      a('fini', { fin: 90 }),
      a('off', { actif: false }),
    ];
    expect(annoncesVisibles(liste, 'pros', 100).map((x) => x.id)).toEqual(['pros', 'tous']);
    expect(annoncesVisibles(liste, 'particuliers', 100).map((x) => x.id)).toEqual(['tous', 'part']);
  });
});

describe('minuit à Paris', () => {
  it('heure d’été et d’hiver', () => {
    expect(new Date(minuitParis('2026-10-04')).toISOString()).toBe('2026-10-03T22:00:00.000Z');
    expect(new Date(minuitParis('2026-12-04')).toISOString()).toBe('2026-12-03T23:00:00.000Z');
  });
});
