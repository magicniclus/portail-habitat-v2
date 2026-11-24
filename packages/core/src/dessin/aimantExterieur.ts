import type { Niveau, Point } from '../schemas/dessinScene';
import { murPlein } from './ailesToit';
import { aimanter } from './aimantation';
import { contourPiscine } from './formePiscine';

/**
 * Poignée d'une terrasse ou d'une piscine tirée à la souris (DES-18, DES-20) : aimantée aux
 * angles de la maison (murs épaisseur comprise), des autres terrasses et des autres piscines,
 * puis alignée sur eux, puis à la grille de 5 cm. La forme qu'on tire n'est jamais une cible.
 * Alt (côté éditeur) pose librement.
 */
export function viserExterieur(
  n: Niveau,
  tiree: { genre: 'terrasse' | 'piscine'; id: string },
  vers: Point,
  tolerance: number,
): Point {
  const autre = (genre: 'terrasse' | 'piscine', id: string) =>
    genre !== tiree.genre || id !== tiree.id;
  const points = [
    ...n.murs.filter((m) => m.type !== 'separation').flatMap(murPlein),
    ...n.exterieur.terrasses.filter((t) => autre('terrasse', t.id)).flatMap((t) => t.contour),
    ...n.exterieur.piscines.filter((p) => autre('piscine', p.id)).flatMap(contourPiscine),
  ];
  return aimanter(vers, { points, segments: [] }, { tolerance, grille: 50 }).point;
}
