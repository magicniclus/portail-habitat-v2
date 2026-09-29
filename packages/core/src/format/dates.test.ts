import { describe, expect, it } from 'vitest';
import { formatDate, formatRelatif } from './dates';

// 27/09/2026 12:05 UTC = 14:05 à Paris (heure d'été)
const d = new Date(Date.UTC(2026, 8, 27, 12, 5));

describe('formatDate', () => {
  it('formate en français, fuseau Europe/Paris', () => {
    expect(formatDate(d)).toBe('27/09/2026');
    expect(formatDate(d, 'long')).toBe('27 septembre 2026');
    expect(formatDate(d, 'moisAnnee')).toBe('septembre 2026');
    expect(formatDate(d, 'dateHeure')).toBe('27/09/2026 à 14:05');
  });
  it('applique le fuseau de Paris et non celui de la machine', () => {
    // 31/12 23:30 UTC = 01/01 00:30 à Paris
    expect(formatDate(new Date(Date.UTC(2026, 11, 31, 23, 30)))).toBe('01/01/2027');
  });
  it('accepte un nombre, une chaîne ISO ou un objet avec toDate() (Timestamp)', () => {
    expect(formatDate(d.getTime())).toBe('27/09/2026');
    expect(formatDate('2026-09-27T12:05:00Z')).toBe('27/09/2026');
    expect(formatDate({ toDate: () => d })).toBe('27/09/2026');
  });
  it('refuse une date invalide', () => {
    expect(() => formatDate('pas une date')).toThrow(RangeError);
  });
});

describe('formatRelatif', () => {
  const maintenant = new Date(Date.UTC(2026, 8, 27, 12, 0));
  const avant = (ms: number) => new Date(maintenant.getTime() - ms);
  const min = 60_000;
  const h = 60 * min;
  const j = 24 * h;

  it.each([
    [10_000, 'à l’instant'],
    [5 * min, 'il y a 5 minutes'],
    [2 * h, 'il y a 2 heures'],
    [j, 'hier'],
    [3 * j, 'il y a 3 jours'],
  ])('%i ms avant → %s', (ecart, attendu) => {
    expect(formatRelatif(avant(ecart), maintenant)).toBe(attendu);
  });
  it('au-delà de 7 jours, affiche la date', () => {
    expect(formatRelatif(avant(8 * j), maintenant)).toBe('19/09/2026');
  });
  it('gère le futur proche', () => {
    expect(formatRelatif(new Date(maintenant.getTime() + 2 * h), maintenant)).toBe('dans 2 heures');
  });
});

describe('jourIso', () => {
  it('jour à Paris, pas en UTC', async () => {
    const { jourIso } = await import('./dates');
    expect(jourIso(new Date('2026-09-28T22:30:00Z'))).toBe('2026-09-29');
    expect(jourIso(new Date('2026-01-15T10:00:00Z'))).toBe('2026-01-15');
  });
});
