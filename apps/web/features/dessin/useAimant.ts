'use client';

import {
  aimanter,
  arrondir,
  orthogonal,
  toleranceEnMm,
  type Aimantage,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { useMemo } from 'react';
import type { EtatEditeur } from './etat';

/**
 * Point du pointeur pendant un tracé (DES-06, DES-08) : Maj = horizontal ou vertical depuis le
 * point précédent ; sinon aimanté aux extrémités, aux murs et aux alignements (si l'aimant est
 * actif), au mm. Le résultat porte aussi la nature de l'accroche et les guides à afficher.
 */
export function useAimant(n: Niveau, etat: Pick<EtatEditeur, 'aimant' | 'trace' | 'zoom'>) {
  const cibles = useMemo(
    () => ({
      points: n.murs.flatMap((m) => [m.a, m.b]),
      segments: n.murs.map((m) => [m.a, m.b] as const),
    }),
    [n.murs],
  );
  return (p: Point, droit = false): Aimantage =>
    droit && etat.trace
      ? { point: orthogonal(etat.trace, p), type: 'libre' }
      : etat.aimant
        ? aimanter(p, cibles, {
            tolerance: toleranceEnMm(12, etat.zoom),
            grille: 50,
            ...(etat.trace ? { origine: etat.trace } : {}),
          })
        : { point: arrondir(p), type: 'libre' };
}
