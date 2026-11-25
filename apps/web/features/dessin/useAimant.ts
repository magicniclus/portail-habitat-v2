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
import { niveauxVoisins } from './etatAimant';

/**
 * Point du pointeur pendant un tracé (DES-06, DES-08) : Maj = horizontal ou vertical depuis le
 * point précédent ; sinon aimanté aux extrémités, aux murs (du niveau et des niveaux voisins)
 * et aux alignements (si l'aimant est
 * actif), au mm. Une menuiserie se tire sans aimant (le côté du mur où l'on clique compte),
 * un escalier se pose librement (ses virages s'aimantent aux angles courants). Le résultat porte aussi la nature de l'accroche et les guides à afficher.
 */
export function useAimant(
  n: Niveau,
  etat: Pick<EtatEditeur, 'aimant' | 'outil' | 'trace' | 'zoom' | 'historique' | 'niveauId'>,
) {
  // Murs des niveaux voisins aussi : un étage se trace exactement sur le rez-de-chaussée.
  const scene = etat.historique.present;
  const cibles = useMemo(() => {
    const murs = [...n.murs, ...niveauxVoisins(scene, n.id).flatMap((v) => v.murs)];
    return {
      points: murs.flatMap((m) => [m.a, m.b]),
      segments: murs.map((m) => [m.a, m.b] as const),
    };
  }, [n.murs, n.id, scene]);
  return (p: Point, droit = false): Aimantage =>
    droit && etat.trace
      ? { point: orthogonal(etat.trace, p), type: 'libre' }
      : etat.aimant && etat.outil !== 'ouverture' && etat.outil !== 'escalier'
        ? aimanter(p, cibles, {
            tolerance: toleranceEnMm(12, etat.zoom),
            grille: 50,
            ...(etat.trace ? { origine: etat.trace } : {}),
          })
        : { point: arrondir(p), type: 'libre' };
}
