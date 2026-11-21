'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** Bande (px) au bord de la zone du plan où le glisser fait avancer la vue. */
const BORD = 48;
/** Avancée maximale par image (px). */
const MAX = 18;

type Pointeur = { clientX: number; clientY: number; altKey: boolean; shiftKey: boolean };

const vitesse = (pos: number, debut: number, fin: number) => {
  const v = pos < debut + BORD ? pos - (debut + BORD) : pos > fin - BORD ? pos - (fin - BORD) : 0;
  return Math.max(-MAX, Math.min(MAX, v / 2.5));
};

/**
 * Défilement automatique du plan (DES-06, DES-09) : en tirant un mur, un objet ou un tracé près
 * du bord, la vue avance dans cette direction, sans limite (le plan est infini). Le geste est
 * rejoué à chaque image, le pointeur restant immobile : le mur s'allonge au fur et à mesure.
 */
export function useDefilementAuto(
  conteneur: RefObject<HTMLDivElement | null>,
  deplacer: (dx: number, dy: number) => void,
) {
  const dernier = useRef<Pointeur | null>(null);
  const image = useRef<number | null>(null);
  const rappel = useRef<(p: Pointeur) => boolean>(() => false);

  const arreter = useCallback(() => {
    if (image.current !== null) cancelAnimationFrame(image.current);
    image.current = null;
  }, []);
  useEffect(() => arreter, [arreter]);

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
      deplacer(-dx, -dy);
      if (!rappel.current(p)) return arreter();
      image.current = requestAnimationFrame(() => pas.current());
    };
  });

  return {
    /** À chaque mouvement : `bouger` applique le geste et dit si un geste est en cours. */
    suivre(ev: Pointeur, bouger: (p: Pointeur) => boolean) {
      const p = {
        clientX: ev.clientX,
        clientY: ev.clientY,
        altKey: ev.altKey,
        shiftKey: ev.shiftKey,
      };
      const avant = dernier.current;
      dernier.current = p;
      rappel.current = bouger;
      if (!bouger(p)) return arreter();
      const r = conteneur.current?.getBoundingClientRect();
      if (!r) return;
      const [vx, vy] = [vitesse(p.clientX, r.left, r.right), vitesse(p.clientY, r.top, r.bottom)];
      // La vue n'avance que si l'on va vers le bord : un geste commencé près du bord et qui
      // s'en éloigne ne la fait pas bouger.
      const versLeBord =
        !avant ||
        (vx !== 0 && Math.sign(vx) === Math.sign(p.clientX - avant.clientX)) ||
        (vy !== 0 && Math.sign(vy) === Math.sign(p.clientY - avant.clientY));
      if (image.current === null && (vx || vy) && versLeBord)
        image.current = requestAnimationFrame(() => pas.current());
    },
    arreter,
  };
}
