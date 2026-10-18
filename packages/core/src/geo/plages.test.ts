import { describe, expect, it } from 'vitest';
import { distanceKm } from '../matching/filtres';
import { encoderGeohash } from './geohash';
import { plagesGeohash } from './plages';

const BORDEAUX = { latitude: 44.8378, longitude: -0.5792 };

// Générateur déterministe (pas de Math.random dans les tests).
function hasard(graine: number) {
  let s = graine;
  return () => {
    s = (s * 1_103_515_245 + 12_345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe('plagesGeohash', () => {
  it('9 plages au plus, bornes ordonnées', () => {
    const p = plagesGeohash(BORDEAUX, 30);
    expect(p.length).toBeGreaterThan(0);
    expect(p.length).toBeLessThanOrEqual(9);
    for (const [debut, fin] of p) expect(debut < fin).toBe(true);
  });

  it.each([5, 10, 30, 60])('tout point à moins de %i km tombe dans une plage', (rayon) => {
    const plages = plagesGeohash(BORDEAUX, rayon);
    const h = hasard(rayon);
    let testes = 0;
    while (testes < 400) {
      const p = {
        latitude: BORDEAUX.latitude + (h() - 0.5) * (rayon / 50),
        longitude: BORDEAUX.longitude + (h() - 0.5) * (rayon / 35),
      };
      if (distanceKm(BORDEAUX, p) > rayon) continue;
      testes++;
      const g = encoderGeohash(p.latitude, p.longitude);
      expect(plages.some(([d, f]) => g >= d && g < f)).toBe(true);
    }
  });

  it('un point lointain (Paris) est hors de toutes les plages à 30 km', () => {
    const g = encoderGeohash(48.8566, 2.3522);
    expect(plagesGeohash(BORDEAUX, 30).some(([d, f]) => g >= d && g < f)).toBe(false);
  });
});
