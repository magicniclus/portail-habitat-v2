import type { Mur, Niveau, Point } from '../schemas/dessinScene';
import { murPlein } from './ailesToit';
import { distancePointSegment, pointDansPolygone } from './geometrie';

/** Deux murs se touchent : un bout de l'un sur l'autre (angle ou jonction en T). */
const touche = (m: Mur, n: Mur) => {
  const marge = Math.max(m.epaisseur, n.epaisseur) / 2 + 5;
  return (
    distancePointSegment(m.a, n.a, n.b) <= marge ||
    distancePointSegment(m.b, n.a, n.b) <= marge ||
    distancePointSegment(n.a, m.a, m.b) <= marge ||
    distancePointSegment(n.b, m.a, m.b) <= marge
  );
};

/** Bâtiments du niveau : groupes de murs reliés entre eux (maison, garage, abri séparés). */
export function batiments(murs: readonly Mur[]): Mur[][] {
  const reste = [...murs];
  const groupes: Mur[][] = [];
  while (reste.length) {
    const groupe = [reste.shift()!];
    for (let i = 0; i < groupe.length; i++)
      for (let j = reste.length - 1; j >= 0; j--)
        if (touche(groupe[i]!, reste[j]!)) groupe.push(...reste.splice(j, 1));
    groupes.push(groupe);
  }
  return groupes;
}

/**
 * Bâtiment qui contient le point (une pièce ou un mur choisi) : le groupe de murs dont le
 * rectangle englobant le contient, le plus petit s'il y en a plusieurs ; sinon `null`.
 */
export function batimentEn(murs: readonly Mur[], p: Point): Mur[] | null {
  const boite = (g: Mur[]) => {
    const xs = g.flatMap((m) => [m.a.x, m.b.x]);
    const ys = g.flatMap((m) => [m.a.y, m.b.y]);
    const e = Math.max(...g.map((m) => m.epaisseur));
    return {
      x0: Math.min(...xs) - e,
      x1: Math.max(...xs) + e,
      y0: Math.min(...ys) - e,
      y1: Math.max(...ys) + e,
    };
  };
  return (
    batiments(murs)
      .map((g) => ({ g, b: boite(g) }))
      .filter(({ b }) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1)
      .sort(
        (a, b) => (a.b.x1 - a.b.x0) * (a.b.y1 - a.b.y0) - (b.b.x1 - b.b.x0) * (b.b.y1 - b.b.y0),
      )[0]?.g ?? null
  );
}

/**
 * Mur qui porte l'étage (DES-33) : son milieu est sous une pièce, un mur extérieur ou un mur
 * porteur de l'étage. Seuls ces murs montent jusqu'au plancher de l'étage ; ceux d'une partie
 * sans étage s'arrêtent à leur hauteur (sinon ils traversent le toit de l'appentis).
 */
export function murSousEtage(m: Mur, dessus: Pick<Niveau, 'murs' | 'pieces'>): boolean {
  const milieu = { x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 };
  return [
    ...dessus.pieces.map((p) => p.contour),
    ...dessus.murs.filter((x) => x.type === 'mur' || x.porteur).map(murPlein),
  ].some((poly) => pointDansPolygone(milieu, poly));
}
