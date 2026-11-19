import { contourPiscine, type Niveau, type Point } from '@ph/core/dessin';

/** Cadre du dessin en mm : tout le niveau, avec une marge, et au moins 12 × 10 m. */
export function cadreDe(
  n: Niveau,
  parcelle: readonly Point[] = [],
): { x: number; y: number; l: number; h: number } {
  // La maison et son extérieur (terrasses, piscines, allées, clôtures, végétaux).
  const e = n.exterieur;
  const points = [
    ...n.murs.flatMap((m) => [m.a, m.b]),
    ...parcelle,
    ...e.terrasses.flatMap((t) => t.contour),
    ...e.allees.flat(),
    ...e.clotures.flatMap((c) => c.points),
    ...e.piscines.flatMap((p) => contourPiscine(p)),
    ...e.vegetation.flatMap((v) => [
      { x: v.position.x - v.diametre / 2, y: v.position.y - v.diametre / 2 },
      { x: v.position.x + v.diametre / 2, y: v.position.y + v.diametre / 2 },
    ]),
  ];
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
