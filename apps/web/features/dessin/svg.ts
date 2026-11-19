import type { Point } from '@ph/core/dessin';
import type { KeyboardEvent } from 'react';

/** Attribut `points` d'un polygone SVG. */
export const points = (poly: readonly Point[]) => poly.map((p) => `${p.x},${p.y}`).join(' ');

/** Entrée ou Espace sur un élément du plan focalisé : même effet qu'un clic. */
export const activer = (faire: () => void) => (ev: KeyboardEvent) => {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    faire();
  }
};

/** Point de l'écran (pointeur) converti en millimètres du plan ; `null` avant l'affichage. */
export function versMmDuPlan(
  el: SVGSVGElement | null,
  ev: { clientX: number; clientY: number },
): Point | null {
  const matrice = el?.getScreenCTM();
  if (!matrice) return null;
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(matrice.inverse());
  return { x: p.x, y: p.y };
}
