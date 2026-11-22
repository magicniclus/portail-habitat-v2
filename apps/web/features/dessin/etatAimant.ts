import { aimanter, distance, toleranceEnMm, type Niveau, type Point } from '@ph/core/dessin';

/**
 * Extrémité de mur tirée à la souris (DES-06) : aimantée comme au tracé, depuis l'autre bout
 * du mur (angles droits et à 45°, alignements, autres murs, grille de 5 cm). Les murs reliés
 * à cette extrémité la suivent : ils ne servent pas de cible.
 */
export function viserExtremite(
  n: Niveau,
  murId: string,
  bout: 'a' | 'b',
  vers: Point,
  zoom: number,
): Point {
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return vers;
  const ici = m[bout];
  const origine = bout === 'a' ? m.b : m.a;
  const autres = n.murs.filter(
    (x) => x.id !== murId && distance(x.a, ici) > 1 && distance(x.b, ici) > 1,
  );
  return aimanter(
    vers,
    {
      points: autres.flatMap((x) => [x.a, x.b]),
      segments: autres.map((x) => [x.a, x.b] as const),
    },
    { tolerance: toleranceEnMm(12, zoom), grille: 50, origine, pasAngle: 450 },
  ).point;
}
