import type { Mur, Ouverture, Point, TypeMur } from '../schemas/dessinScene';
import { distance, distancePointSegment, intersectionSegments, memePoint } from './geometrie';

/** Épaisseurs et hauteurs par défaut à la création (DESSIN.md DES-07), en mm. */
export const EPAISSEUR_DEFAUT: Record<TypeMur, number> = {
  mur: 200,
  cloison: 70,
  demi_mur: 100,
  muret: 150,
  separation: 0,
  poteau: 200,
  poutre: 200,
};
export const HAUTEUR_FIXE: Partial<Record<TypeMur, number>> = { demi_mur: 1_100, muret: 600 };

/** Types qui ferment une pièce (les murets, demi-murs, poteaux et poutres ne la ferment pas). */
export const TYPES_FERMANTS: readonly TypeMur[] = ['mur', 'cloison', 'separation'];

export const longueurMur = (m: Pick<Mur, 'a' | 'b'>): number => distance(m.a, m.b);

/** Les 4 coins du mur vu de dessus, selon son alignement sur l'axe tracé. */
export function contourMur(m: Pick<Mur, 'a' | 'b' | 'epaisseur' | 'alignement'>): Point[] {
  const l = longueurMur(m);
  const nx = -(m.b.y - m.a.y) / l;
  const ny = (m.b.x - m.a.x) / l;
  const [gauche, droite] =
    m.alignement === 'gauche'
      ? [m.epaisseur, 0]
      : m.alignement === 'droite'
        ? [0, m.epaisseur]
        : [m.epaisseur / 2, m.epaisseur / 2];
  const dec = (p: Point, d: number) => ({ x: p.x + nx * d, y: p.y + ny * d });
  return [dec(m.a, gauche), dec(m.b, gauche), dec(m.b, -droite), dec(m.a, -droite)];
}

export type Jonction = 'L' | 'T' | 'X';

/** Nature de la rencontre de deux murs (DES-09), `null` s'ils ne se touchent pas. */
export function jonction(m1: Mur, m2: Mur, tolerance = 1): Jonction | null {
  const extremites1 = [m1.a, m1.b];
  const extremites2 = [m2.a, m2.b];
  if (extremites1.some((p) => extremites2.some((q) => memePoint(p, q, tolerance)))) return 'L';
  if (
    extremites1.some((p) => distancePointSegment(p, m2.a, m2.b) <= tolerance) ||
    extremites2.some((p) => distancePointSegment(p, m1.a, m1.b) <= tolerance)
  )
    return 'T';
  return intersectionSegments(m1.a, m1.b, m2.a, m2.b) ? 'X' : null;
}

/** Murs dont une extrémité est en `p` (ils suivent quand on déplace ce point). */
export function extremitesEn(
  murs: readonly Mur[],
  p: Point,
  tolerance = 1,
): { murId: string; extremite: 'a' | 'b' }[] {
  return murs.flatMap((m) => [
    ...(memePoint(m.a, p, tolerance) ? [{ murId: m.id, extremite: 'a' as const }] : []),
    ...(memePoint(m.b, p, tolerance) ? [{ murId: m.id, extremite: 'b' as const }] : []),
  ]);
}

/** Une ouverture doit tenir entièrement dans la longueur du mur. */
export const ouvertureTientDansLeMur = (o: Pick<Ouverture, 'position' | 'largeur'>, m: Mur) =>
  o.position + o.largeur <= Math.round(longueurMur(m));

/** Surface d'une face de mur, ouvertures déduites (mm²). Hauteur moyenne pour un mur rampant. */
export function surfaceFaceNette(m: Mur, ouvertures: readonly Ouverture[]): number {
  const hauteur = (m.hauteur + (m.hauteurB ?? m.hauteur)) / 2;
  const brute = longueurMur(m) * hauteur;
  const trous = ouvertures
    .filter((o) => o.murId === m.id)
    .reduce((s, o) => s + o.largeur * Math.min(o.hauteur, Math.max(0, hauteur - o.allege)), 0);
  return Math.max(0, Math.round(brute - trous));
}
