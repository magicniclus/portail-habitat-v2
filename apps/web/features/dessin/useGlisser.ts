'use client';

import { arrondir, distance, type Niveau, type Point } from '@ph/core/dessin';
import { useCallback, useLayoutEffect, useRef, type Dispatch, type PointerEvent } from 'react';
import type { Action } from './etat';

/**
 * Glisser un mur (parallèlement, par pas), une porte ou fenêtre (le long de son mur) ou un objet (vers la position du pointeur, placé
 * automatiquement ; Alt pour poser librement). Un seul pas d'historique par geste.
 */
export function useGlisser(
  n: Niveau,
  dispatch: Dispatch<Action>,
  versMm: (ev: PointerEvent) => Point | null,
  trace: boolean,
) {
  const geste = useRef<{
    genre: 'mur' | 'objet' | 'extremite' | 'ouverture';
    /** Extrémité : « {murId}:a » ou « {murId}:b ». */
    id: string;
    dernier: Point;
    cle: string;
    /** Objet : écart entre son centre et le pointeur au départ, gardé pendant le geste. */
    decalage: Point;
  } | null>(null);

  return {
    demarrer(genre: 'mur' | 'objet' | 'extremite' | 'ouverture', id: string, ev: PointerEvent) {
      const p = versMm(ev);
      if (!p || (trace && genre !== 'ouverture')) return;
      (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
      const o = genre === 'objet' ? n.objets.find((x) => x.id === id) : undefined;
      geste.current = {
        genre,
        id,
        dernier: arrondir(p),
        cle: `glisser-${id}-${Date.now()}`,
        decalage: o ? { x: o.position.x - p.x, y: o.position.y - p.y } : { x: 0, y: 0 },
      };
    },
    /** `true` si un geste est en cours (le mouvement lui appartient). */
    bouger(p: Point, libre: boolean): boolean {
      const g = geste.current;
      if (!g) return false;
      const vers = arrondir(p);
      if (distance(vers, g.dernier) < 10) return true;
      if (g.genre === 'ouverture')
        dispatch({ type: 'glisserOuverture', id: g.id, vers, geste: g.cle });
      else if (g.genre === 'extremite') {
        const [murId, bout] = g.id.split(':') as [string, 'a' | 'b'];
        dispatch({ type: 'deplacerExtremite', murId, extremite: bout, vers, geste: g.cle });
      } else if (g.genre === 'mur')
        dispatch({
          type: 'deplacerMur',
          murId: g.id,
          delta: { x: vers.x - g.dernier.x, y: vers.y - g.dernier.y },
          geste: g.cle,
        });
      else
        dispatch({
          type: 'deplacerObjetVers',
          id: g.id,
          vers: { x: vers.x + g.decalage.x, y: vers.y + g.decalage.y },
          geste: g.cle,
          libre,
        });
      g.dernier = vers;
      return true;
    },
    finir() {
      if (!geste.current) return;
      geste.current = null;
      dispatch({ type: 'finGeste' });
    },
  };
}

/** Rappels stables pour les calques mémorisés (DES-48) : ils lisent toujours le dernier glisser. */
export function useRappelsGlisser(glisser: ReturnType<typeof useGlisser>) {
  const courant = useRef(glisser);
  // Mis à jour avant l'affichage : un pointeur juste après un changement d'outil lit le bon état.
  useLayoutEffect(() => {
    courant.current = glisser;
  });
  return {
    demarrerMur: useCallback(
      (id: string, ev: PointerEvent) => courant.current.demarrer('mur', id, ev),
      [],
    ),
    demarrerObjet: useCallback(
      (id: string, ev: PointerEvent) => courant.current.demarrer('objet', id, ev),
      [],
    ),
    demarrerOuverture: useCallback(
      (id: string, ev: PointerEvent) => courant.current.demarrer('ouverture', id, ev),
      [],
    ),
    demarrerExtremite: useCallback(
      (murId: string, bout: 'a' | 'b', ev: PointerEvent) =>
        courant.current.demarrer('extremite', `${murId}:${bout}`, ev),
      [],
    ),
  };
}
