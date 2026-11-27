import type { Point } from '../schemas/dessinScene';
import { centroide, distancePointSegment, pointDansPolygone } from './geometrie';

/** Distance d'un point au contour d'un polygone (mm). */
const distanceAuBord = (p: Point, poly: readonly Point[]) =>
  Math.min(...poly.map((a, i) => distancePointSegment(p, a, poly[(i + 1) % poly.length]!)));

/**
 * Où écrire le nom d'une pièce : le point le plus éloigné des murs (au centre de la plus grande
 * partie de la pièce), et non le centre de gravité, qui sort d'une pièce en L. Le centre de
 * gravité est gardé s'il est presque aussi dégagé : l'étiquette ne saute pas d'un point à
 * l'autre pour quelques millimètres. `rayon` : place libre autour (distance aux murs, mm).
 */
export function placeEtiquette(poly: readonly Point[]): { centre: Point; rayon: number } {
  const g = centroide(poly);
  if (poly.length < 3) return { centre: g, rayon: 0 };
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  let [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  let meilleur = { p: g, d: pointDansPolygone(g, poly) ? distanceAuBord(g, poly) : -1 };
  const depart = meilleur.d;
  // Grille de plus en plus fine autour du meilleur point trouvé.
  for (let tour = 0; tour < 4; tour++) {
    const pas = Math.max(x1 - x0, y1 - y0) / 16;
    if (pas < 1) break;
    for (let x = x0 + pas / 2; x < x1; x += pas)
      for (let y = y0 + pas / 2; y < y1; y += pas) {
        const p = { x, y };
        if (!pointDansPolygone(p, poly)) continue;
        const d = distanceAuBord(p, poly);
        if (d > meilleur.d) meilleur = { p, d };
      }
    [x0, y0, x1, y1] = [
      meilleur.p.x - pas,
      meilleur.p.y - pas,
      meilleur.p.x + pas,
      meilleur.p.y + pas,
    ];
  }
  if (depart >= meilleur.d * 0.85) return { centre: g, rayon: depart };
  return {
    centre: { x: Math.round(meilleur.p.x), y: Math.round(meilleur.p.y) },
    rayon: meilleur.d,
  };
}

/** Point où écrire le nom d'une pièce (voir `placeEtiquette`). */
export const centreEtiquette = (poly: readonly Point[]): Point => placeEtiquette(poly).centre;
