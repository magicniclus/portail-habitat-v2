import type { Objet, Point } from '../schemas/dessinScene';
import { versRepere } from './geometrie';

/** Les 4 coins de l'objet vu de dessus. Le « dos » est le côté y = -p/2 (contre le mur). */
export function contourObjet(o: Pick<Objet, 'position' | 'rotation' | 'dimensions'>): Point[] {
  const { l, p } = o.dimensions;
  return [
    { x: -l / 2, y: -p / 2 },
    { x: l / 2, y: -p / 2 },
    { x: l / 2, y: p / 2 },
    { x: -l / 2, y: p / 2 },
  ].map(versRepere(o.position, o.rotation));
}
