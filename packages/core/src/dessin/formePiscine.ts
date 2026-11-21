import type { Niveau, Point } from '../schemas/dessinScene';

type Piscine = Niveau['exterieur']['piscines'][number];

const cercle = (cx: number, cy: number, rx: number, ry: number, n = 32): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });

/** Contour de la piscine dans le plan (bassin intérieur), placé et tourné. */
export function contourPiscine(p: Omit<Piscine, 'id'>): Point[] {
  const [L, l] = [p.longueur / 2, p.largeur / 2];
  let local: Point[];
  switch (p.forme) {
    case 'ronde':
    case 'ovale':
      local = cercle(0, 0, L, p.forme === 'ronde' ? L : l);
      break;
    case 'haricot':
      // Ovale creusé d'un côté (forme de rein).
      local = Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * 2 * Math.PI;
        const creux = Math.sin(a) > 0 ? 1 - 0.45 * Math.sin(a) ** 2 * Math.cos(a / 2) ** 8 : 1;
        return { x: L * Math.cos(a), y: l * Math.sin(a) * creux };
      });
      break;
    case 'L':
      // Bassin principal sur toute la longueur, retour sur la moitié de la longueur.
      local = [
        { x: -L, y: -l },
        { x: L, y: -l },
        { x: L, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: l },
        { x: -L, y: l },
      ];
      break;
    default:
      local = [
        { x: -L, y: -l },
        { x: L, y: -l },
        { x: L, y: l },
        { x: -L, y: l },
      ];
  }
  const r = (p.rotation / 1800) * Math.PI;
  const [c, s] = [Math.cos(r), Math.sin(r)];
  return local.map((q) => ({
    x: Math.round(p.position.x + q.x * c - q.y * s),
    y: Math.round(p.position.y + q.x * s + q.y * c),
  }));
}
