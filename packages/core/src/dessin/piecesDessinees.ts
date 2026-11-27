import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Point } from '../schemas/dessinScene';
import { ajouterMur, type Contexte } from './commandes';
import { aire, distance, intersectionSegments } from './geometrie';

/**
 * Pièce dessinée d'un geste (DES-12) : un rectangle (deux coins opposés) ou un polygone (points
 * successifs) devient des murs, la pièce est détectée. Contour sans croisement, côtés ≥ 10 cm.
 */
export function pieceDepuisContour(
  n: Niveau,
  contour: readonly Point[],
  ctx: Contexte,
): Resultat<Niveau> {
  const pts = contour.filter((p, i) => i === 0 || distance(p, contour[i - 1]!) >= 1);
  if (pts.length > 2 && distance(pts[0]!, pts.at(-1)!) < 1) pts.pop();
  if (pts.length < 3) return echec('ENTREE_INVALIDE', { message: 'Placez au moins trois points.' });
  if (pts.length > 64) return echec('ENTREE_INVALIDE', { message: '64 côtés au plus.' });
  const cotes = pts.map((p, i) => [p, pts[(i + 1) % pts.length]!] as const);
  if (cotes.some(([a, b]) => distance(a, b) < 100))
    return echec('ENTREE_INVALIDE', { message: 'Chaque côté doit mesurer au moins 10 cm.' });
  if (Math.abs(aire(pts)) < 250_000)
    return echec('ENTREE_INVALIDE', { message: 'Pièce trop petite (0,25 m² au moins).' });
  // Deux côtés non voisins ne doivent pas se croiser.
  for (let i = 0; i < cotes.length; i++)
    for (let j = i + 2; j < cotes.length; j++) {
      if (i === 0 && j === cotes.length - 1) continue;
      if (intersectionSegments(cotes[i]![0], cotes[i]![1], cotes[j]![0], cotes[j]![1]))
        return echec('ENTREE_INVALIDE', {
          message: 'Le contour se croise : tracez-le sans le recouper.',
        });
    }
  let courant: Resultat<Niveau> = succes(n);
  for (const [a, b] of cotes) {
    if (!courant.ok) break;
    courant = ajouterMur(courant.data, { a, b, type: 'mur' }, ctx);
  }
  return courant;
}

/** Pièce rectangulaire : deux coins opposés (DES-12). */
export function pieceRectangle(n: Niveau, a: Point, b: Point, ctx: Contexte): Resultat<Niveau> {
  if (a.x === b.x || a.y === b.y)
    return echec('ENTREE_INVALIDE', {
      message: 'Tracez un rectangle : les deux coins doivent être opposés.',
    });
  return pieceDepuisContour(n, [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }], ctx);
}
