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

/** Arrête net une animation de zoom ou de glissement en cours. */
function arreterAnimation(s: SVGSVGElement) {
  s.style.transition = 'none';
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
    // Les crans d'une même image s'additionnent : un seul rendu par image, sans à-coups.
    let cumul = 0;
    let dernier = { x: 0, y: 0 };
    let image = 0;
    const appliquer = () => {
      image = 0;
      const s = svg.current;
      const m = s?.getScreenCTM();
      if (!s || !m) return;
      ancre.current = {
        mm: new DOMPoint(dernier.x, dernier.y).matrixTransform(m.inverse()),
        ecran: dernier,
        molette: true,
      };
      const facteur = Math.exp(-Math.max(-240, Math.min(240, cumul)) * 0.0025);
      cumul = 0;
      dispatch({ type: 'zoom', zoom: zoomCourant.current * facteur });
    };
    const molette = (ev: WheelEvent) => {
      const s = svg.current;
      if (!s) return;
      ev.preventDefault();
      // Une animation de zoom en cours fausserait la mesure du point visé : on l'arrête.
      arreterAnimation(s);
      cumul += ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
      dernier = { x: ev.clientX, y: ev.clientY };
      if (!image) image = requestAnimationFrame(appliquer);
    };
    const bas = () => void (geste.current = true);
    const haut = () => void (geste.current = false);
    el.addEventListener('wheel', molette, { passive: false });
    el.addEventListener('pointerdown', bas);
    window.addEventListener('pointerup', haut);
    return () => {
      cancelAnimationFrame(image);
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
    if (!el || !s) return;
    // Mesures sans l'animation en cours : sinon elle passerait pour un changement de zoom.
    arreterAnimation(s);
    const m = s.getScreenCTM();
    if (!m) return;
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
    const prec = avant.current;
    if (a) {
      ancre.current = null;
      const p = a.mm.matrixTransform(m);
      el.scrollBy(p.x - a.ecran.x, p.y - a.ecran.y);
    }
    // Position finale mesurée avant de lancer l'animation (qui déforme la mesure).
    const fin = s.getScreenCTM()!;
    avant.current = {
      e: fin.e,
      f: fin.f,
      a: fin.a,
      centre: new DOMPoint(milieu.x, milieu.y).matrixTransform(fin.inverse()),
      ajustement,
    };
    if (a) {
      // Le point fixe reste sous le pointeur ; le reste glisse vers sa nouvelle taille.
      // Molette : zoom direct, cran par cran (déjà progressif) ; boutons : zoom animé.
      if (prec && prec.a !== m.a && !a.molette) {
        const b = s.getBoundingClientRect();
        zoomer(s, prec.a / m.a, a.ecran.x - b.left, a.ecran.y - b.top, 260);
      }
    } else if (prec && prec.a === m.a && !geste.current && !traceEnCours && !ajuste) {
      const [dx, dy] = [prec.e - m.e, prec.f - m.f];
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) glisser(s, dx, dy);
    }
  }, [conteneur, svg, zoom, cadre.x, cadre.y, cadre.l, cadre.h, traceEnCours, ajustement]);
}
