import { describe, expect, it } from 'vitest';
import { solSousPiscine } from './piscineSol';

describe('piscine 3D : plancher sous l’eau', () => {
  const piscine = {
    id: 'pi_t0000001',
    forme: 'rectangle' as const,
    position: { x: 5_000, y: 5_000 },
    rotation: 0,
    longueur: 6_000,
    largeur: 3_000,
    profondeurMin: 1_100,
    profondeurMax: 1_800,
    escalier: null,
    margelle: { famille: 'pierre' as const },
    debordement: false,
  };
  const terrasse = (x0: number, x1: number, hauteur: number) => ({
    id: `te_t${x0}0000`,
    contour: [
      { x: x0, y: 0 },
      { x: x1, y: 0 },
      { x: x1, y: 10_000 },
      { x: x0, y: 10_000 },
    ],
    revetement: { famille: 'bois' as const },
    hauteur,
    gardeCorps: false,
    pergola: false,
  });

  it('à cheval sur deux terrasses : la plus haute ; sur le gazon : le sol', () => {
    // Centre sur la première, mais la seconde (plus haute) est touchée aussi.
    expect(solSousPiscine(piscine, [terrasse(0, 6_000, 0), terrasse(6_000, 12_000, 300)])).toBe(
      300,
    );
    expect(solSousPiscine(piscine, [terrasse(0, 12_000, 0)])).toBe(40);
    expect(solSousPiscine(piscine, [terrasse(20_000, 30_000, 500)])).toBe(0);
  });
});
