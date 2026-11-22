import { contourPiscine, pointDansPolygone, type Piscine, type Terrasse } from '@ph/core/dessin';

/**
 * Plancher sous la piscine : la plus haute des terrasses qu'elle touche (même en partie, même
 * à cheval sur deux morceaux), sinon le sol.
 */
export function solSousPiscine(p: Piscine, terrasses: readonly Terrasse[]): number {
  const bassin = contourPiscine(p);
  const touche = (t: Terrasse) =>
    bassin.some((q) => pointDansPolygone(q, t.contour)) ||
    t.contour.some((q) => pointDansPolygone(q, bassin)) ||
    pointDansPolygone(p.position, t.contour);
  return Math.max(0, ...terrasses.filter(touche).map((t) => Math.max(t.hauteur, 40)));
}
