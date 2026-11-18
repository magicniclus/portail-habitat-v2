import type { Point } from '../schemas/dessinScene';
import { arrondir, distance, milieu, projeter, radians } from './geometrie';

/** Aimantation pendant le tracé et le déplacement (DES-08). */
export type TypeAimant = 'extremite' | 'milieu' | 'segment' | 'angle' | 'grille' | 'libre';

export interface CiblesAimant {
  points: readonly Point[];
  segments: readonly (readonly [Point, Point])[];
}

export interface OptionsAimant {
  /** Rayon d'attraction en mm (l'interface le déduit du zoom : ~10 px à l'écran). */
  tolerance: number;
  /** Pas de la grille en mm ; absent = pas de grille. */
  grille?: number;
  /** Point de départ du segment en cours : active l'aimantation d'angle. */
  origine?: Point;
  /** Pas d'angle en dixièmes de degré (150 = 15°). */
  pasAngle?: number;
}

/** Tolérance en mm pour un rayon donné en pixels, à `pixelsParMetre` du zoom courant. */
export const toleranceEnMm = (pixels: number, pixelsParMetre: number) =>
  Math.round((pixels / pixelsParMetre) * 1000);

/** Point aimanté par ordre de priorité : extrémité, milieu, segment, angle, grille. */
export function aimanter(
  p: Point,
  cibles: CiblesAimant,
  options: OptionsAimant,
): { point: Point; type: TypeAimant } {
  const proche = (q: Point) => distance(p, q) <= options.tolerance;
  const plusProche = (candidats: Point[]) =>
    candidats.filter(proche).sort((a, b) => distance(p, a) - distance(p, b))[0];

  const extremite = plusProche([...cibles.points]);
  if (extremite) return { point: arrondir(extremite), type: 'extremite' };

  const centre = plusProche(cibles.segments.map(([a, b]) => milieu(a, b)));
  if (centre) return { point: arrondir(centre), type: 'milieu' };

  const surSegment = plusProche(cibles.segments.map(([a, b]) => projeter(p, a, b).point));
  if (surSegment) return { point: arrondir(surSegment), type: 'segment' };

  if (options.origine) {
    const o = options.origine;
    const pas = radians(options.pasAngle ?? 150);
    const l = distance(o, p);
    const a = Math.round(Math.atan2(p.y - o.y, p.x - o.x) / pas) * pas;
    const q = { x: o.x + l * Math.cos(a), y: o.y + l * Math.sin(a) };
    if (proche(q)) return { point: arrondir(q), type: 'angle' };
  }

  if (options.grille) {
    const g = options.grille;
    return { point: { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g }, type: 'grille' };
  }
  return { point: arrondir(p), type: 'libre' };
}
