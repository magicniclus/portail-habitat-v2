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
