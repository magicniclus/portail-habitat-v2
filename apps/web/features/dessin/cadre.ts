import { contourPiscine, type Niveau, type Point } from '@ph/core/dessin';
import { useMemo } from 'react';

/**
 * Cadre du dessin en mm : tout le niveau et le trace en cours, avec une marge, et au moins
 * 12 × 10 m.
 */
export function cadreDe(
  n: Niveau,
  parcelle: readonly Point[] = [],
  /** Tracé en cours (point de départ, curseur) : le cadre s'agrandit avec lui. */
  enCours: readonly Point[] = [],
): { x: number; y: number; l: number; h: number } {
  // La maison et son extérieur (terrasses, piscines, allées, clôtures, végétaux).
  const e = n.exterieur;
  const points = [
    ...n.murs.flatMap((m) => [m.a, m.b]),
    ...parcelle,
    ...enCours,
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

/**
 * Cadre du plan affiché : recalculé quand le niveau change, ou quand le trace en cours franchit
 * un demi-mètre (un mur tiré au-delà du cadre agrandit le plan pendant le geste).
 */
export function useCadre(
  n: Niveau,
  parcelle: readonly Point[] | undefined,
  trace: readonly (Point | null | undefined)[],
) {
  const enCours = trace.filter((p): p is Point => p != null);
  const cle = enCours.map((p) => `${Math.round(p.x / 500)},${Math.round(p.y / 500)}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `cle` résume `enCours`
  return useMemo(() => cadreDe(n, parcelle, enCours), [n, parcelle, cle]);
}
