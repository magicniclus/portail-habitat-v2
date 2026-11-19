'use client';

import {
  aimanter,
  arrondir,
  orthogonal,
  toleranceEnMm,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { useMemo } from 'react';
import type { EtatEditeur } from './etat';

/**
 * Point du pointeur pendant un tracé (DES-06, DES-08) : Maj = horizontal ou vertical depuis le
 * point précédent ; sinon aimanté aux extrémités et aux murs (si l'aimant est actif), au mm.
 */
export function useAimant(n: Niveau, etat: Pick<EtatEditeur, 'aimant' | 'trace' | 'zoom'>) {
  const cibles = useMemo(
    () => ({
      points: n.murs.flatMap((m) => [m.a, m.b]),
      segments: n.murs.map((m) => [m.a, m.b] as const),
    }),
    [n.murs],
  );
  return (p: Point, droit = false): Point =>
    droit && etat.trace
      ? orthogonal(etat.trace, p)
      : etat.aimant
        ? aimanter(p, cibles, {
            tolerance: toleranceEnMm(12, etat.zoom),
            grille: 50,
            ...(etat.trace ? { origine: etat.trace } : {}),
          }).point
        : arrondir(p);
}
