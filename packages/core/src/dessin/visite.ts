import type { Niveau, Point, Scene } from '../schemas/dessinScene';
import { objetDuCatalogue } from './catalogue';
import { contourObjet } from './emprise';
import { aire, centroide, distance, pointDansPolygone, projeter } from './geometrie';
import { niveauxTries } from './niveaux';
import { marchesEscalier } from './escaliers3d';
import { morceauxDeMur, type Pave } from './volumes';

/**
 * Visite à la première personne (DES-34) : obstacles au niveau du corps, déplacement qui
 * glisse le long des murs, passage des portes, marches qu'on monte, niveau sous les pieds.
 */

/** Hauteurs du corps au-dessus du sol : ce qui est plus bas s'enjambe, plus haut passe au-dessus. */
const BAS_DU_CORPS = 300;
const HAUT_DU_CORPS = 1_800;
/** Rayon du visiteur (épaules). */
export const RAYON_VISITEUR = 250;
/** Plus haute marche franchie d'un pas. */
const MARCHE_MAX = 260;
export const HAUTEUR_YEUX = 1_600;

const coinsPave = (p: Pave): Point[] => {
  const [c, s] = [Math.cos(p.angle), Math.sin(p.angle)];
  const { l, p: e } = p.taille;
  return [
    [-l / 2, -e / 2],
    [l / 2, -e / 2],
    [l / 2, e / 2],
    [-l / 2, e / 2],
  ].map(([x, y]) => ({ x: p.centre.x + x! * c - y! * s, y: p.centre.y + x! * s + y! * c }));
};

/**
 * Obstacles d'un niveau (polygones au sol) : morceaux de murs et meubles qui croisent la
 * hauteur du corps. Les baies de portes, les tapis et les meubles hauts ne bloquent pas.
 */
export function obstaclesVisite(n: Niveau): Point[][] {
  const corps = (bas: number, haut: number) =>
    bas < n.altitude + HAUT_DU_CORPS && haut > n.altitude + BAS_DU_CORPS;
  const murs = n.murs
    .flatMap((m) => morceauxDeMur(m, n))
    .filter((p) => corps(p.centre.z - p.taille.h / 2, p.centre.z + p.taille.h / 2))
    .map(coinsPave);
  const meubles = n.objets
    .filter((o) => objetDuCatalogue(o.catalogueId)?.symbole !== 'tapis')
    .filter((o) => corps(n.altitude + o.altitude, n.altitude + o.altitude + o.dimensions.h))
    .map((o) => contourObjet(o));
  return [...murs, ...meubles];
}

function touche(p: Point, poly: readonly Point[], rayon: number): boolean {
  if (pointDansPolygone(p, poly)) return true;
  return poly.some(
    (a, i) => distance(p, projeter(p, a, poly[(i + 1) % poly.length]!).point) < rayon,
  );
}

/** Pas de calcul : un déplacement plus long est découpé pour ne jamais traverser un mur fin. */
const PAS = 100;

/** Avance de `d` ; contre un obstacle, glisse le long (un axe à la fois), sinon reste sur place. */
export function deplacerVisiteur(
  p: Point,
  d: Point,
  obstacles: readonly Point[][],
  rayon = RAYON_VISITEUR,
): Point {
  const libre = (q: Point) => !obstacles.some((o) => touche(q, o, rayon));
  const n = Math.max(1, Math.ceil(Math.hypot(d.x, d.y) / PAS));
  const pas = { x: d.x / n, y: d.y / n };
  let q = p;
  for (let i = 0; i < n; i++) {
    const suite = [
      { x: q.x + pas.x, y: q.y + pas.y },
      { x: q.x + pas.x, y: q.y },
      { x: q.x, y: q.y + pas.y },
    ].find(libre);
    if (!suite) break;
    q = suite;
  }
  return { x: Math.round(q.x), y: Math.round(q.y) };
}

/**
 * Altitude des pieds en `p` (DES-34, escaliers praticables) : la plus haute marche sous le
 * visiteur qu'on peut atteindre d'un pas depuis `zActuel`, sinon le sol du niveau.
 */
export function solSousLesPieds(scene: Scene, p: Point, zActuel: number): number {
  let z = Number.NEGATIVE_INFINITY;
  for (const n of niveauxTries(scene)) {
    if (
      n.altitude <= zActuel + MARCHE_MAX &&
      n.pieces.some((pc) => pointDansPolygone(p, pc.contour))
    )
      z = Math.max(z, n.altitude);
    for (const e of n.escaliers)
      for (const m of marchesEscalier(e, n.altitude)) {
        const dessus = m.centre.z + m.taille.h / 2;
        if (dessus <= zActuel + MARCHE_MAX && pointDansPolygone(p, coinsPave(m)))
          z = Math.max(z, dessus);
      }
  }
  return Number.isFinite(z) ? z : zActuel;
}

/** Niveau où se trouve le visiteur (le plus haut sous ses pieds). */
export function niveauALaHauteur(scene: Scene, z: number): Niveau {
  const tries = niveauxTries(scene);
  return tries.filter((n) => n.altitude <= z + 1).at(-1) ?? tries[0]!;
}

/**
 * Point de départ : centre de la plus grande pièce du niveau (ou de ses murs), décalé vers la
 * place libre la plus proche si un meuble l'occupe.
 */
export function departVisite(n: Niveau): Point {
  const piece = [...n.pieces].sort((a, b) => aire(b.contour) - aire(a.contour))[0];
  const pts = n.murs.flatMap((m) => [m.a, m.b]);
  const brut = piece ? centroide(piece.contour) : pts.length ? centroide(pts) : { x: 0, y: 0 };
  const obstacles = obstaclesVisite(n);
  const libre = (q: Point) =>
    (!piece || pointDansPolygone(q, piece.contour)) &&
    !obstacles.some((o) => touche(q, o, RAYON_VISITEUR));
  // Anneaux de 30 cm autour du centre, 16 directions, jusqu'à 6 m.
  for (let r = 0; r <= 6_000; r += 300)
    for (let i = 0; i < (r ? 16 : 1); i++) {
      const a = (i / 16) * 2 * Math.PI;
      const q = {
        x: Math.round(brut.x + r * Math.cos(a)),
        y: Math.round(brut.y + r * Math.sin(a)),
      };
      if (libre(q)) return q;
    }
  return brut;
}
