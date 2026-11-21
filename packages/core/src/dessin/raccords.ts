import type { Mur, Point } from '../schemas/dessinScene';
import { distancePointSegment, memePoint } from './geometrie';
import { contourMur } from './murs';

/** Types qui ne se raccordent pas : une séparation est un trait, une poutre passe au-dessus. */
const SANS_RACCORD = new Set<Mur['type']>(['separation', 'poutre']);
/** En dessous de ce sinus (≈ 10°), l'angle est trop plat ou trop aigu pour un onglet. */
const SINUS_MIN = Math.sin((10 * Math.PI) / 180);
/** Un onglet plus long que trois épaisseurs serait une pointe disgracieuse. */
const ONGLET_MAX = 3;

type Vecteur = Point;
const sous = (p: Point, q: Point): Vecteur => ({ x: p.x - q.x, y: p.y - q.y });
const scal = (u: Vecteur, v: Vecteur) => u.x * v.x + u.y * v.y;
const vect = (u: Vecteur, v: Vecteur) => u.x * v.y - u.y * v.x;
const unitaire = (u: Vecteur): Vecteur => {
  const l = Math.hypot(u.x, u.y);
  return { x: u.x / l, y: u.y / l };
};

/** Intersection des droites (p, p + u) et (q, q + v), supposées non parallèles. */
function croiser(p: Point, u: Vecteur, q: Point, v: Vecteur): Point {
  const t = vect(sous(q, p), v) / vect(u, v);
  return { x: p.x + u.x * t, y: p.y + u.y * t };
}

/** Indices du contour [a+g, b+g, b−d, a−d] : côté gauche puis droit à l'extrémité donnée. */
const INDICES = { a: [0, 3], b: [1, 2] } as const;

interface Bout {
  mur: Mur;
  bout: 'a' | 'b';
  /** Direction du mur en partant de la jonction. */
  sortie: Vecteur;
}

/** Taille des cases (mm) de l'index des murs : on ne compare que des murs voisins. */
const CASE = 1000;

/**
 * Index des murs (DES-48) : extrémités par coordonnées arrondies, murs par cases du plan. Les
 * jonctions se trouvent sans comparer chaque mur à tous les autres (500 murs : quelques ms).
 */
function indexer(murs: readonly Mur[]) {
  const extremites = new Map<string, Bout[]>();
  const cases = new Map<string, Mur[]>();
  const cle = (x: number, y: number) => `${x}|${y}`;
  for (const mur of murs) {
    for (const bout of ['a', 'b'] as const) {
      const p = mur[bout];
      const k = cle(Math.round(p.x), Math.round(p.y));
      const b = { mur, bout, sortie: unitaire(sous(mur[bout === 'a' ? 'b' : 'a'], p)) };
      extremites.set(k, [...(extremites.get(k) ?? []), b]);
    }
    const [x0, x1] = [Math.min(mur.a.x, mur.b.x) - 1, Math.max(mur.a.x, mur.b.x) + 1];
    const [y0, y1] = [Math.min(mur.a.y, mur.b.y) - 1, Math.max(mur.a.y, mur.b.y) + 1];
    for (let i = Math.floor(x0 / CASE); i <= Math.floor(x1 / CASE); i++)
      for (let j = Math.floor(y0 / CASE); j <= Math.floor(y1 / CASE); j++)
        cases.set(cle(i, j), [...(cases.get(cle(i, j)) ?? []), mur]);
  }
  return {
    /** Extrémités de murs confondues avec `p` (à 1 mm près). */
    bouts(p: Point): Bout[] {
      const [x, y] = [Math.round(p.x), Math.round(p.y)];
      const trouves: Bout[] = [];
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const b of extremites.get(cle(x + dx, y + dy)) ?? [])
            if (memePoint(b.mur[b.bout], p, 1)) trouves.push(b);
      return trouves;
    },
    /** Murs dont l'emprise touche la case de `p`. */
    voisins: (p: Point) => cases.get(cle(Math.floor(p.x / CASE), Math.floor(p.y / CASE))) ?? [],
  };
}

/** Raccorde en onglet l'extrémité `x` avec l'autre mur `y` ; contours modifiés en place. */
function onglet(x: Bout, y: Bout, contours: Map<string, Point[]>) {
  const [cx, cy] = [contours.get(x.mur.id)!, contours.get(y.mur.id)!];
  const faces = (b: Bout, c: Point[], vers: Vecteur) => {
    const [g, d] = INDICES[b.bout];
    // La face gauche (décalée selon la normale du mur) regarde-t-elle l'autre mur ?
    const normale = { x: -(b.mur.b.y - b.mur.a.y), y: b.mur.b.x - b.mur.a.x };
    return scal(normale, vers) > 0 ? { dedans: g, dehors: d, c } : { dedans: d, dehors: g, c };
  };
  const fx = faces(x, cx, y.sortie);
  const fy = faces(y, cy, x.sortie);
  const dehors = croiser(cx[fx.dehors]!, x.sortie, cy[fy.dehors]!, y.sortie);
  const dedans = croiser(cx[fx.dedans]!, x.sortie, cy[fy.dedans]!, y.sortie);
  const jonction = x.mur[x.bout];
  const limite = ONGLET_MAX * Math.max(x.mur.epaisseur, y.mur.epaisseur);
  if (Math.hypot(dehors.x - jonction.x, dehors.y - jonction.y) > limite) return;
  cx[fx.dehors] = cy[fy.dehors] = dehors;
  cx[fx.dedans] = cy[fy.dedans] = dedans;
}

/**
 * Contour de chaque mur, angles en L fermés en onglet (DES-09) : les faces extérieures se
 * prolongent jusqu'à se croiser, les faces intérieures aussi. Les jonctions en T ou en X et les
 * angles trop plats ou trop aigus gardent leur rectangle (les surfaces se recouvrent déjà).
 */
export function contoursRaccordes(murs: readonly Mur[]): Map<string, Point[]> {
  const pleins = murs.filter((m) => !SANS_RACCORD.has(m.type));
  const contours = new Map(murs.map((m) => [m.id, contourMur(m)]));
  const faits = new Set<string>();
  const index = indexer(pleins);
  for (const m of pleins)
    for (const bout of ['a', 'b'] as const) {
      const ici = index.bouts(m[bout]);
      const cle = ici
        .map((b) => `${b.mur.id}:${b.bout}`)
        .sort()
        .join('|');
      if (ici.length !== 2 || faits.has(cle)) continue;
      faits.add(cle);
      const [x, y] = ici as [Bout, Bout];
      if (Math.abs(vect(x.sortie, y.sortie)) < SINUS_MIN) continue;
      onglet(x, y, contours);
    }
  for (const m of pleins) for (const bout of ['a', 'b'] as const) enT(m, bout, index, contours);
  return contours;
}

/**
 * Jonction en T : l'extrémité libre d'un mur posée sur le milieu d'un autre s'arrête sur la face
 * de ce mur hôte (coupée en sifflet si elle arrive en biais) au lieu de le traverser.
 */
function enT(
  m: Mur,
  bout: 'a' | 'b',
  index: ReturnType<typeof indexer>,
  contours: Map<string, Point[]>,
) {
  const p = m[bout];
  if (index.bouts(p).length !== 1) return;
  const hote = index
    .voisins(p)
    .find(
      (w) =>
        w.id !== m.id &&
        distancePointSegment(p, w.a, w.b) <= 1 &&
        !memePoint(p, w.a, 1) &&
        !memePoint(p, w.b, 1),
    );
  if (!hote) return;
  const sortie = unitaire(sous(m[bout === 'a' ? 'b' : 'a'], p));
  const uw = unitaire(sous(hote.b, hote.a));
  if (Math.abs(vect(sortie, uw)) < SINUS_MIN) return;
  // Face de l'hôte tournée vers le mur : côté de sa normale gauche (points 0-1) ou droite (3-2).
  const ch = contourMur(hote);
  const face = scal({ x: -uw.y, y: uw.x }, sortie) > 0 ? ch[0]! : ch[3]!;
  const c = contours.get(m.id)!;
  for (const i of INDICES[bout]) c[i] = croiser(c[i]!, sortie, face, uw);
}
