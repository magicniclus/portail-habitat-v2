import { describe, expect, it } from 'vitest';
import { popularitesIntentions } from './popularite';

describe('popularité des intentions (RECHERCHE §2)', () => {
  const ids = Array.from({ length: 10 }, (_, i) => `i${i}`);
  it('5 pour les plus demandées, 1 pour les moins demandées et celles sans demande', () => {
    const comptes = Object.fromEntries(ids.map((id, i) => [id, (10 - i) * 30]));
    comptes.i9 = 0;
    const p = popularitesIntentions(comptes, ids, 200)!;
    expect(p.i0).toBe(5);
    expect(p.i1).toBe(5);
    expect(p.i4).toBe(3);
    expect(p.i8).toBe(1);
    expect(p.i9).toBe(1);
  });
  it('trop peu de demandes : pas de recalcul', () => {
    expect(popularitesIntentions({ i0: 50, i1: 20 }, ids, 200)).toBeNull();
  });
});
