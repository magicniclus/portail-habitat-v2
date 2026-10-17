import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { groupesMetiers, nomMetier } = await import('./metiers');

describe('métiers de l’inscription pro', () => {
  it('60 métiers répartis dans 15 familles, aucun oublié', () => {
    const g = groupesMetiers();
    expect(g).toHaveLength(15);
    expect(g.flatMap((x) => x.metiers)).toHaveLength(60);
    expect(g[0]!.nom).toBe('Salle de bain et cuisine');
  });
  it('tri alphabétique français dans chaque famille', () => {
    for (const x of groupesMetiers()) {
      const noms = x.metiers.map((m) => m.nom);
      expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, 'fr')));
    }
  });
  it('nom d’un métier', () => {
    expect(nomMetier('couvreur')).toBe('Couvreur');
    expect(nomMetier('inconnu')).toBeUndefined();
  });
});
