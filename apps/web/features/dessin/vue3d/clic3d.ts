'use client';

import { longueurMur, pointSurMur, projeter, type Point } from '@ph/core/dessin';
import type { ThreeEvent } from '@react-three/fiber';
import type { Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from '../etat';
import { versMm } from './unites';

/** Ce qu'on clique en 3D : mur (et son côté), sol d'une pièce, menuiserie, escalier, terrain. */
type Cible3D =
  | { genre: 'mur'; id: string; face: 'a' | 'b' | undefined }
  | { genre: 'piece' | 'zone' | 'ouverture' | 'escalier'; id: string }
  | { genre: 'terrain' };

export interface Clic3D {
  selection: EtatEditeur['selection'];
  cliquer: (c: Cible3D, ev: ThreeEvent<MouseEvent>) => void;
}

/** Au-delà (px), le geste était une rotation de la caméra, pas un clic. */
const GLISSE_MAX = 6;

/**
 * Édition en 3D : un clic sélectionne le mur (côté cliqué), le sol ou la menuiserie, que l'on
 * modifie dans Propriétés ou Finitions. Avec l'outil porte ou fenêtre, un clic sur un mur la
 * pose (taille du catalogue) ; avec un objet du catalogue, un clic le pose à cet endroit.
 */
export function clic3D(etat: EtatEditeur, dispatch: Dispatch<Action>): Clic3D {
  return {
    selection: etat.selection,
    cliquer(c, ev) {
      if (ev.delta > GLISSE_MAX) return;
      ev.stopPropagation();
      const p: Point = { x: versMm(ev.point.x), y: versMm(ev.point.z) };
      if (etat.outil === 'objet') return dispatch({ type: 'poserPoint', point: p });
      if (etat.outil === 'ouverture') {
        const m = c.genre === 'mur' ? niveauDe(etat).murs.find((x) => x.id === c.id) : undefined;
        if (!m) return;
        const sur = pointSurMur(m, projeter(p, m.a, m.b).t * longueurMur(m));
        if (etat.trace) dispatch({ type: 'terminerTrace' });
        // Deux clics au même endroit : menuiserie du catalogue, centrée.
        dispatch({ type: 'poserPoint', point: sur });
        dispatch({ type: 'poserPoint', point: sur });
        return;
      }
      if (c.genre === 'terrain') return dispatch({ type: 'selectionner', selection: null });
      dispatch({
        type: 'selectionner',
        selection: {
          genre: c.genre,
          id: c.id,
          ...(c.genre === 'mur' && c.face ? { face: c.face } : {}),
        },
      });
      // Mur ou sol : les couleurs et matériaux sont dans Finitions, ouvert pour la suite.
      if (
        (c.genre === 'mur' || c.genre === 'piece' || c.genre === 'zone') &&
        etat.menu !== 'finitions'
      )
        dispatch({ type: 'menu', menu: 'finitions' });
    },
  };
}
