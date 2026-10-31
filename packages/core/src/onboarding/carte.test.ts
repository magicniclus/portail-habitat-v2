import { describe, expect, it } from 'vitest';
import { diametreRayonPx, intensiteZone, tuilesCarte, zoomCarte } from './carte';

// Carte de l'étape 2 (maquette Onboarding Etape 2) : tuiles OpenStreetMap 256 px, cercle du rayon.
describe('carte de la zone', () => {
  it('zoom : France entière sans ville, puis selon le rayon', () => {
    expect(zoomCarte(null)).toBe(5);
    expect(zoomCarte(30)).toBe(9);
    expect(zoomCarte(50)).toBe(8);
    expect(zoomCarte(100)).toBe(7);
  });

  it('tuiles qui couvrent la vue, centrées sur le point', () => {
    const t = tuilesCarte({ latitude: 44.8378, longitude: -0.5792 }, 9, 1000, 760);
    expect(t.length).toBeGreaterThanOrEqual(12);
    expect(t.every((x) => x.url.startsWith('https://tile.openstreetmap.org/9/'))).toBe(true);
    // Le centre de la vue (500, 380) tombe dans une tuile.
    expect(t.some((x) => x.x <= 500 && x.x + 256 > 500 && x.y <= 380 && x.y + 256 > 380)).toBe(
      true,
    );
  });

  it('diamètre du cercle proportionnel au rayon', () => {
    const d30 = diametreRayonPx(44.84, 9, 30);
    expect(diametreRayonPx(44.84, 9, 60)).toBeCloseTo(d30 * 2, 0);
    expect(d30).toBeGreaterThan(100);
    expect(d30).toBeLessThan(800);
  });

  it('intensité affichée selon le nombre de demandes', () => {
    expect(intensiteZone(20)).toBe('Zone très active en ce moment');
    expect(intensiteZone(12)).toBe('Zone active en ce moment');
    expect(intensiteZone(3)).toBe('Zone calme, peu de concurrence');
  });
});
