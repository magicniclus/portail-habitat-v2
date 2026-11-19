'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** Bande (px) au bord de la zone du plan où le glisser fait défiler. */
const BORD = 48;
/** Défilement maximal par image (px). */
const MAX = 24;

type Pointeur = { clientX: number; clientY: number; altKey: boolean; shiftKey: boolean };

const vitesse = (pos: number, debut: number, fin: number) => {
  const v = pos < debut + BORD ? pos - (debut + BORD) : pos > fin - BORD ? pos - (fin - BORD) : 0;
  return Math.max(-MAX, Math.min(MAX, Math.round(v / 2)));
};

/**
 * Défilement automatique du plan (DES-06, DES-09) : en tirant un mur, un objet ou un tracé près
 * du bord, la vue suit. Le geste est rejoué à chaque image, le pointeur restant immobile. Quand
 * le cadre du dessin s'agrandit vers le haut ou la gauche, le défilement compense pour que le
 * dessin ne saute pas.
 */
export function useDefilementAuto(
  conteneur: RefObject<HTMLDivElement | null>,
  rejouer: (p: Pointeur) => void,
  cadre: { x: number; y: number },
  mmParPx: number,
) {
  const dernier = useRef<Pointeur | null>(null);
  const image = useRef<number | null>(null);
  const rappel = useRef(rejouer);
  useLayoutEffect(() => {
    rappel.current = rejouer;
  });

  const { x, y } = cadre;
  const precedent = useRef({ x, y, mmParPx });
  useLayoutEffect(() => {
    const avant = precedent.current;
    precedent.current = { x, y, mmParPx };
    if (avant.mmParPx !== mmParPx) return;
    conteneur.current?.scrollBy((avant.x - x) / mmParPx, (avant.y - y) / mmParPx);
  }, [conteneur, x, y, mmParPx]);

  const arreter = useCallback(() => {
    if (image.current !== null) cancelAnimationFrame(image.current);
    image.current = null;
  }, []);
  useEffect(() => arreter, [arreter]);

  // Boucle d'animation : une image tant que le pointeur reste dans la bande du bord.
  const pas = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    pas.current = () => {
      const el = conteneur.current;
      const p = dernier.current;
      if (!el || !p) return arreter();
      const r = el.getBoundingClientRect();
      const dx = vitesse(p.clientX, r.left, r.right);
      const dy = vitesse(p.clientY, r.top, r.bottom);
      if (!dx && !dy) return arreter();
      el.scrollBy(dx, dy);
      rappel.current(p);
      image.current = requestAnimationFrame(() => pas.current());
    };
  });

  return {
    /** À chaque mouvement : `actif` quand un geste ou un tracé est en cours. */
    suivre(p: Pointeur, actif: boolean) {
      dernier.current = {
        clientX: p.clientX,
        clientY: p.clientY,
        altKey: p.altKey,
        shiftKey: p.shiftKey,
      };
      if (!actif) return arreter();
      if (image.current === null) image.current = requestAnimationFrame(() => pas.current());
    },
    arreter,
  };
}
