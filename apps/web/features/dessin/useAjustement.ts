'use client';

import { useEffect, useRef, type Dispatch, type RefObject } from 'react';
import type { Action } from './etat';

/**
 * Ajuster à l'écran (à l'ouverture, au bouton, quand un panneau s'ouvre) : le cadre du dessin
 * remplit la zone visible. Sur téléphone, la feuille du bas réserve sa place par un retrait bas
 * du conteneur : le plan se cadre au-dessus d'elle (DES-46).
 */
export function useAjustement(
  conteneur: RefObject<HTMLDivElement | null>,
  cadre: { l: number; h: number },
  ajustement: number,
  dispatch: Dispatch<Action>,
) {
  const cadreCourant = useRef(cadre);
  useEffect(() => {
    cadreCourant.current = cadre;
  }, [cadre]);
  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const visible = height - (Number.parseFloat(getComputedStyle(el).paddingBottom) || 0);
    const c = cadreCourant.current;
    if (width > 0 && visible > 0)
      dispatch({ type: 'zoom', zoom: Math.min((width / c.l) * 1000, (visible / c.h) * 1000) });
  }, [conteneur, ajustement, dispatch]);
}
