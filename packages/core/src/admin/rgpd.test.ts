import { describe, expect, it } from 'vitest';
import { echeanceRgpd, joursRestants } from './rgpd';

describe('RGPD (ADMIN §2.13)', () => {
  it('délai légal d’un mois calendaire, fin de mois comprise', () => {
    expect(new Date(echeanceRgpd(Date.UTC(2026, 8, 14, 10))).toISOString()).toBe(
      '2026-10-14T10:00:00.000Z',
    );
    expect(new Date(echeanceRgpd(Date.UTC(2026, 0, 31))).toISOString()).toBe(
      '2026-02-28T00:00:00.000Z',
    );
  });
  it('jours restants, arrondis au jour supérieur, négatifs en retard', () => {
    const J = 86_400_000;
    expect(joursRestants(10 * J, 0)).toBe(10);
    expect(joursRestants(10 * J, 9.5 * J)).toBe(1);
    expect(joursRestants(0, 2 * J)).toBe(-2);
  });
});
