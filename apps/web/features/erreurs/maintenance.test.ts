import { describe, expect, it } from 'vitest';
import { doitAfficherMaintenance } from './maintenance';

describe('doitAfficherMaintenance', () => {
  it('rien quand la maintenance est coupée', () => {
    expect(doitAfficherMaintenance('/', false)).toBe(false);
  });
  it.each(['/', '/simulateur', '/pro/demandes', '/administration'])('redirige %s', (chemin) => {
    expect(doitAfficherMaintenance(chemin, true)).toBe(true);
  });
  it.each([
    '/admin',
    '/admin/artisans',
    '/api/health',
    '/maintenance',
    '/_next/static/x.js',
    '/favicon.ico',
  ])('laisse passer %s', (chemin) => {
    expect(doitAfficherMaintenance(chemin, true)).toBe(false);
  });
});
