import { describe, expect, it } from 'vitest';
import { centreEtiquette } from './etiquette';

describe('centre de l’étiquette d’une pièce', () => {
  it('rectangle : son centre', () => {
    const r = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ];
    expect(centreEtiquette(r)).toEqual({ x: 2000, y: 1500 });
  });

  it('pièce en L : dans la pièce, au cœur de la grande aile, pas dans l’angle vide', () => {
    // L : grande aile 6 × 2 m en haut, petite aile 2 × 4 m à gauche.
    const l = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 2000 },
      { x: 2000, y: 2000 },
      { x: 2000, y: 6000 },
      { x: 0, y: 6000 },
    ];
    const c = centreEtiquette(l);
    // Le centre de gravité (≈ 2,2 ; 2,2 m) tombe hors de la pièce.
    expect(c.y).toBeLessThan(2000);
    expect(c.y).toBeGreaterThan(600);
    expect(centreEtiquette([{ x: 1, y: 2 }])).toEqual({ x: 1, y: 2 });
  });
});
