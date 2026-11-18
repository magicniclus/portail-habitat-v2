import type { Niveau } from '@ph/core/dessin';

/** Cadre du dessin en mm : tout le niveau, avec une marge, et au moins 12 × 10 m. */
export function cadreDe(n: Niveau): { x: number; y: number; l: number; h: number } {
  const points = n.murs.flatMap((m) => [m.a, m.b]);
  const MARGE = 3_000;
  if (points.length === 0)
    return { x: -MARGE, y: -MARGE, l: 12_000 + 2 * MARGE, h: 10_000 + 2 * MARGE };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs) - MARGE;
  const y = Math.min(...ys) - MARGE;
  return {
    x,
    y,
    l: Math.max(Math.max(...xs) + MARGE - x, 12_000),
    h: Math.max(Math.max(...ys) + MARGE - y, 10_000),
  };
}
