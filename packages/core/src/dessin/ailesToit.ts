import type { Niveau, Point } from '../schemas/dessinScene';
import { pointDansPolygone } from './geometrie';
import { contourMur, longueurMur } from './murs';

/**
 * Découpage de l'emprise d'un niveau en « ailes » rectangulaires (toits en L, T, U, H) :
 * grille tirée des coordonnées des murs et des pièces, plus grands rectangles, recouvrement
 * minimal, puis les ailes secondaires s'arrêtent au faîtage de l'aile principale (noues).
 * La partie couverte par le niveau du dessus est exclue ; un côté collé à l'étage = appentis.
 */
export interface Aile {
  /** Rectangle dans le repère de la maison (a, b), aux murs. */
  a0: number;
  a1: number;
  b0: number;
  b1: number;
  /** Faîtage le long de a (sinon le long de b). */
  selonA: boolean;
  /** Côtés : extérieur (débord, gouttière, pignon), intérieur (contre une autre aile), contre l'étage. */
  cotes: Record<'a0' | 'a1' | 'b0' | 'b1', 'exterieur' | 'interieur' | 'etage'>;
}

export interface Repere {
  u: Point;
  v: Point;
}

/** Repère de la maison : direction du mur le plus long (à 90° près). */
export function repereMaison(n: Pick<Niveau, 'murs'>): Repere {
  const plus = [...n.murs].sort((x, y) => longueurMur(y) - longueurMur(x))[0];
  const ang = plus ? Math.atan2(plus.b.y - plus.a.y, plus.b.x - plus.a.x) : 0;
  const r = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
  const u = { x: Math.cos(r), y: Math.sin(r) };
  return { u, v: { x: -u.y, y: u.x } };
}
const loc = (r: Repere, p: Point) => ({
  a: p.x * r.u.x + p.y * r.u.y,
  b: p.x * r.v.x + p.y * r.v.y,
});
export const monde = (r: Repere, a: number, b: number): Point => ({
  x: r.u.x * a + r.v.x * b,
  y: r.u.y * a + r.v.y * b,
});

/** Mur prolongé d'une demi-épaisseur à chaque bout : les angles de la maison sont pleins. */
export function murPlein(m: Niveau['murs'][number]): Point[] {
  const l = longueurMur(m);
  const d = m.epaisseur / 2;
  const u = { x: ((m.b.x - m.a.x) / l) * d, y: ((m.b.y - m.a.y) / l) * d };
  return contourMur({
    ...m,
    a: { x: m.a.x - u.x, y: m.a.y - u.y },
    b: { x: m.b.x + u.x, y: m.b.y + u.y },
  });
}

/** Pièces sous un toit : tout sauf un patio (cour à ciel ouvert, fermée par les murs). */
export const sousToit = (pieces: Niveau['pieces']) => pieces.filter((p) => p.type !== 'patio');

/**
 * Ce que couvre un étage : ses pièces et l'épaisseur de ses murs (extérieurs, porteurs, cloisons
 * et demi-murs entre deux pièces ; sinon une bande de toit apparaît sous chaque cloison).
 */
export const couvertureEtage = (dessus: Pick<Niveau, 'murs' | 'pieces'>): Point[][] => [
  ...sousToit(dessus.pieces).map((p) => p.contour),
  ...dessus.murs
    .filter((m) => m.porteur || m.type === 'mur' || m.type === 'cloison' || m.type === 'demi_mur')
    .map(murPlein),
];

/** Polygones de l'emprise : pièces couvertes et murs (épaisseur comprise). */
const polygones = (n: Pick<Niveau, 'murs' | 'pieces'>) => [
  ...sousToit(n.pieces).map((p) => p.contour),
  ...n.murs.filter((m) => m.type === 'mur' || m.type === 'cloison').map(murPlein),
];
const dedans = (polys: Point[][], p: Point) => polys.some((q) => pointDansPolygone(p, q));

type Rect = { i0: number; i1: number; j0: number; j1: number };

export function ailesDuNiveau(
  n: Pick<Niveau, 'murs' | 'pieces'>,
  dessus: Pick<Niveau, 'murs' | 'pieces'> | null,
  r: Repere = repereMaison(n),
): Aile[] {
  const polys = polygones(n);
  if (!polys.length) return [];
  const haut = dessus ? couvertureEtage(dessus) : [];
  // Les coordonnées de l'étage découpent aussi la grille : sa limite tombe entre deux cases.
  const pts = [...polys, ...haut].flat().map((p) => loc(r, p));
  // Lignes de la grille ; deux lignes à moins d'un centimètre n'en font qu'une (murs tournés,
  // arrondis au millimètre : sinon des lamelles de toit d'un millimètre apparaissent).
  const uniques = (v: number[]) =>
    [...new Set(v.map((x) => Math.round(x)))]
      .sort((x, y) => x - y)
      .filter((x, i, t) => i === 0 || x - t[i - 1]! >= 10);
  const as = uniques(pts.map((p) => p.a));
  const bs = uniques(pts.map((p) => p.b));
  const [nx, ny] = [as.length - 1, bs.length - 1];
  // Une case est couverte dès qu'une part de la maison sans étage au-dessus y tombe (mur en
  // biais : sinon un coin reste sans toit ; sous un étage complet : rien).
  const echantillons = [0.02, 0.25, 0.5, 0.75, 0.98];
  const touche = (i: number, j: number) =>
    [{ x: 0.5, y: 0.5 }, ...echantillons.flatMap((x) => echantillons.map((y) => ({ x, y })))].some(
      (f) => {
        const p = monde(
          r,
          as[i]! + (as[i + 1]! - as[i]!) * f.x,
          bs[j]! + (bs[j + 1]! - bs[j]!) * f.y,
        );
        return dedans(polys, p) && !dedans(haut, p);
      },
    );
  const plein = Array.from({ length: nx }, (_, i) =>
    Array.from({ length: ny }, (_, j) => touche(i, j)),
  );
  const rempli = (q: Rect) => {
    for (let i = q.i0; i < q.i1; i++)
      for (let j = q.j0; j < q.j1; j++) if (!plein[i]![j]) return false;
    return true;
  };
  // Plus grands rectangles : on ne peut les agrandir d'aucun côté.
  const maximaux: Rect[] = [];
  for (let i0 = 0; i0 < nx; i0++)
    for (let j0 = 0; j0 < ny; j0++)
      for (let i1 = i0 + 1; i1 <= nx; i1++)
        for (let j1 = j0 + 1; j1 <= ny; j1++) {
          const q = { i0, i1, j0, j1 };
          if (!rempli(q)) break;
          const agrandi = [
            i0 > 0 && rempli({ ...q, i0: i0 - 1 }),
            i1 < nx && rempli({ ...q, i1: i1 + 1 }),
            j0 > 0 && rempli({ ...q, j0: j0 - 1 }),
            j1 < ny && rempli({ ...q, j1: j1 + 1 }),
          ];
          if (!agrandi.some(Boolean)) maximaux.push(q);
        }
  const aire = (q: Rect) => (as[q.i1]! - as[q.i0]!) * (bs[q.j1]! - bs[q.j0]!);
  // Recouvrement glouton : les plus grands d'abord, tant qu'ils couvrent du neuf.
  const couvert = plein.map((l) => l.map(() => false));
  const choisis: Rect[] = [];
  for (const q of maximaux.sort((x, y) => aire(y) - aire(x))) {
    let neuf = false;
    for (let i = q.i0; i < q.i1; i++)
      for (let j = q.j0; j < q.j1; j++) if (!couvert[i]![j]) neuf = true;
    if (!neuf) continue;
    choisis.push(q);
    for (let i = q.i0; i < q.i1; i++) for (let j = q.j0; j < q.j1; j++) couvert[i]![j] = true;
  }
  // Une aile dont toutes les cases sont couvertes par les autres est inutile.
  const utiles = choisis.filter((q, k) => {
    for (let i = q.i0; i < q.i1; i++)
      for (let j = q.j0; j < q.j1; j++)
        if (!choisis.some((o, l) => l !== k && o.i0 <= i && i < o.i1 && o.j0 <= j && j < o.j1))
          return true;
    return false;
  });
  // Une partie de moins de 15 cm de large n'est pas un toit (reste d'arrondi).
  const ailes: Aile[] = utiles
    .filter((q) => Math.min(as[q.i1]! - as[q.i0]!, bs[q.j1]! - bs[q.j0]!) >= 150)
    .map((q) => {
      const [a0, a1, b0, b1] = [as[q.i0]!, as[q.i1]!, bs[q.j0]!, bs[q.j1]!];
      return {
        a0,
        a1,
        b0,
        b1,
        selonA: a1 - a0 >= b1 - b0,
        cotes: { a0: 'exterieur', a1: 'exterieur', b0: 'exterieur', b1: 'exterieur' },
      };
    });
  arreterAuxFaitages(ailes);
  // Côtés : contre l'étage (appentis) ou contre une autre partie de la maison.
  for (const w of ailes)
    for (const c of ['a0', 'a1', 'b0', 'b1'] as const) {
      if (w.cotes[c] === 'interieur') continue;
      const juste = (t: number) => {
        const d = 20;
        return c === 'a0'
          ? monde(r, w.a0 - d, w.b0 + (w.b1 - w.b0) * t)
          : c === 'a1'
            ? monde(r, w.a1 + d, w.b0 + (w.b1 - w.b0) * t)
            : c === 'b0'
              ? monde(r, w.a0 + (w.a1 - w.a0) * t, w.b0 - d)
              : monde(r, w.a0 + (w.a1 - w.a0) * t, w.b1 + d);
      };
      const essais = [0.25, 0.5, 0.75].map(juste);
      if (essais.every((p) => dedans(haut, p))) w.cotes[c] = 'etage';
      else if (essais.every((p) => dedans(polys, p))) w.cotes[c] = 'interieur';
    }
  return ailes;
}

/**
 * Une aile secondaire qui bute sur une aile principale perpendiculaire s'arrête à son faîtage :
 * les deux toits se rejoignent en noue, sans pignon caché.
 */
function arreterAuxFaitages(ailes: Aile[]) {
  // L'aile la plus large (faîtage le plus haut) est principale ; à égalité, la plus longue.
  const largeur = (w: Aile) => Math.min(w.a1 - w.a0, w.b1 - w.b0);
  const longueur = (w: Aile) => Math.max(w.a1 - w.a0, w.b1 - w.b0);
  const principale = (p: Aile, s: Aile) =>
    largeur(p) !== largeur(s)
      ? largeur(p) > largeur(s)
      : longueur(p) !== longueur(s)
        ? longueur(p) > longueur(s)
        : ailes.indexOf(p) < ailes.indexOf(s);
  for (const s of ailes)
    for (const p of ailes) {
      if (p === s || p.selonA === s.selonA || !principale(p, s)) continue;
      if (s.selonA) {
        // s court le long de a : ses bouts a0 / a1 peuvent entrer dans p.
        if (s.b0 < p.b0 || s.b1 > p.b1) continue;
        const milieu = (p.a0 + p.a1) / 2;
        if (s.a0 >= p.a0 && s.a0 < p.a1 && s.a1 > p.a1) [s.a0, s.cotes.a0] = [milieu, 'interieur'];
        else if (s.a1 <= p.a1 && s.a1 > p.a0 && s.a0 < p.a0)
          [s.a1, s.cotes.a1] = [milieu, 'interieur'];
      } else {
        if (s.a0 < p.a0 || s.a1 > p.a1) continue;
        const milieu = (p.b0 + p.b1) / 2;
        if (s.b0 >= p.b0 && s.b0 < p.b1 && s.b1 > p.b1) [s.b0, s.cotes.b0] = [milieu, 'interieur'];
        else if (s.b1 <= p.b1 && s.b1 > p.b0 && s.b0 < p.b0)
          [s.b1, s.cotes.b1] = [milieu, 'interieur'];
      }
    }
}
