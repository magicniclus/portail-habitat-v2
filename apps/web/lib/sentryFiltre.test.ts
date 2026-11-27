import { describe, expect, it } from 'vitest';
import { filtrerEvenement, masquerJetons } from './sentryFiltre';

describe('jetons de partage hors de Sentry (DES-42)', () => {
  it('URL, transaction et fil d’événements nettoyés', () => {
    const j = 'A'.repeat(32);
    expect(masquerJetons(`https://x.fr/plan/${j}?a=1`)).toBe('https://x.fr/plan/[jeton]?a=1');
    const e = filtrerEvenement({
      request: { url: `/plan/${j}` },
      transaction: `/plan/${j}`,
      breadcrumbs: [{ message: `vers /plan/${j}`, data: { from: '/', to: `/plan/${j}` } }],
    });
    expect(JSON.stringify(e)).not.toContain(j);
    expect(filtrerEvenement({})).toEqual({});
  });
});
