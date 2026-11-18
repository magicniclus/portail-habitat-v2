import type { Objet, Point } from '../schemas/dessinScene';

const rad = (dixiemes: number) => (dixiemes / 10) * (Math.PI / 180);

/** Les 4 coins de l'objet vu de dessus. Le « dos » est le côté y = -p/2 (contre le mur). */
export function contourObjet(o: Pick<Objet, 'position' | 'rotation' | 'dimensions'>): Point[] {
  const a = rad(o.rotation);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const { l, p } = o.dimensions;
  return [
    { x: -l / 2, y: -p / 2 },
    { x: l / 2, y: -p / 2 },
    { x: l / 2, y: p / 2 },
    { x: -l / 2, y: p / 2 },
  ].map((q) => ({ x: o.position.x + q.x * c - q.y * s, y: o.position.y + q.x * s + q.y * c }));
}
