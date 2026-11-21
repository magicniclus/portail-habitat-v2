'use client';

import { useEffect, useLayoutEffect, useRef, type Dispatch, type RefObject } from 'react';
import type { Action } from './etat';

/** Durée du glissement du plan quand son cadre change (ms). */
const DUREE = 280;

/**
 * Zoom adouci : le dessin repart de son ancienne taille autour du point fixe (pointeur ou
 * centre de la zone) et grandit ou rétrécit jusqu'à la nouvelle.
 */
function zoomer(s: SVGSVGElement, rapport: number, ox: number, oy: number, duree: number) {
  s.style.transition = 'none';
  s.style.transformOrigin = `${ox}px ${oy}px`;
  s.style.transform = `scale(${rapport})`;
  void s.getBoundingClientRect();
  s.style.transition = `transform ${duree}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
  s.style.transform = '';
}

/** Le dessin part de son ancienne place (décalage dx, dy) et glisse jusqu'à la nouvelle. */
function glisser(s: SVGSVGElement, dx: number, dy: number) {
  s.style.transition = 'none';
  s.style.transform = `translate(${dx}px, ${dy}px)`;
  void s.getBoundingClientRect();
  s.style.transition = `transform ${DUREE}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
  s.style.transform = '';
}

/**
 * Navigation du plan 2D : zoom à la molette (ou au pincement du pavé tactile) autour du point
 * sous le pointeur, et recentrage animé quand le cadre change (mur ajouté ou retiré) : le
 * dessin glisse vers sa nouvelle place au lieu de sauter. Pendant un geste (bouton enfoncé),
 * rien ne bouge sous le pointeur.
 */
export function useVue2D(
  conteneur: RefObject<HTMLDivElement | null>,
  svg: RefObject<SVGSVGElement | null>,
  zoom: number,
  cadre: { x: number; y: number; l: number; h: number },
  dispatch: Dispatch<Action>,
  /** Compteur « Ajuster à l'écran » : ce zoom-là recadre tout, sans point fixe ni animation. */
  ajustement: number,
  /** Tracé en cours : le plan ne glisse pas sous le pointeur pendant qu'on dessine. */
  traceEnCours: boolean,
) {
  const zoomCourant = useRef(zoom);
  const ancre = useRef<{ mm: DOMPoint; ecran: { x: number; y: number }; molette?: boolean } | null>(
    null,
  );
  const geste = useRef(false);
  /** Instant du dernier « Ajuster » : le zoom qui suit de près en découle. */
  const ajusteLe = useRef(0);
  const avant = useRef<{
    e: number;
    f: number;
    a: number;
    centre: DOMPoint;
    ajustement: number;
  } | null>(null);

  useEffect(() => {
    zoomCourant.current = zoom;
  }, [zoom]);

  // Molette : zoom progressif, le point sous le pointeur reste en place.
  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    const molette = (ev: WheelEvent) => {
      const s = svg.current?.getScreenCTM();
      if (!s) return;
      ev.preventDefault();
      const facteur = Math.exp(-Math.max(-60, Math.min(60, ev.deltaY)) * 0.004);
      ancre.current = {
        mm: new DOMPoint(ev.clientX, ev.clientY).matrixTransform(s.inverse()),
        ecran: { x: ev.clientX, y: ev.clientY },
        molette: true,
      };
      dispatch({ type: 'zoom', zoom: zoomCourant.current * facteur });
    };
    const bas = () => void (geste.current = true);
    const haut = () => void (geste.current = false);
    el.addEventListener('wheel', molette, { passive: false });
    el.addEventListener('pointerdown', bas);
    window.addEventListener('pointerup', haut);
    return () => {
      el.removeEventListener('wheel', molette);
      el.removeEventListener('pointerdown', bas);
      window.removeEventListener('pointerup', haut);
    };
  }, [conteneur, svg, dispatch]);

  // Après chaque rendu : garder le point de la molette sous le pointeur, ou faire glisser le
  // dessin de son ancienne place vers la nouvelle quand seul le cadre a changé.
  useLayoutEffect(() => {
    const el = conteneur.current;
    const s = svg.current;
    const m = s?.getScreenCTM();
    if (!el || !s || !m) return;
    const r = el.getBoundingClientRect();
    const milieu = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    // Boutons + et − : zoom autour du centre de la zone visible (pas après « Ajuster »).
    // Le zoom calculé par « Ajuster » arrive au rendu suivant : il est exclu lui aussi.
    if (avant.current !== null && avant.current.ajustement !== ajustement)
      ajusteLe.current = performance.now();
    const ajuste = performance.now() - ajusteLe.current < 500;
    if (ajuste) ancre.current = null;
    if (!ajuste && !ancre.current && avant.current && avant.current.a !== m.a)
      ancre.current = { mm: avant.current.centre, ecran: milieu };
    const a = ancre.current;
    if (a) {
      ancre.current = null;
      const p = a.mm.matrixTransform(m);
      el.scrollBy(p.x - a.ecran.x, p.y - a.ecran.y);
      // Le point fixe reste sous le pointeur ; le reste glisse vers sa nouvelle taille.
      const prec = avant.current;
      if (prec && prec.a !== m.a) {
        const b = s.getBoundingClientRect();
        zoomer(s, prec.a / m.a, a.ecran.x - b.left, a.ecran.y - b.top, a.molette ? 140 : 260);
      }
    } else {
      const prec = avant.current;
      if (prec && prec.a === m.a && !geste.current && !traceEnCours && !ajuste) {
        const [dx, dy] = [prec.e - m.e, prec.f - m.f];
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          glisser(s, dx, dy);
        }
      }
    }
    const fin = s.getScreenCTM()!;
    avant.current = {
      e: fin.e,
      f: fin.f,
      a: fin.a,
      centre: new DOMPoint(milieu.x, milieu.y).matrixTransform(fin.inverse()),
      ajustement,
    };
  }, [conteneur, svg, zoom, cadre.x, cadre.y, cadre.l, cadre.h, traceEnCours, ajustement]);
}
