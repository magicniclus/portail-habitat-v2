import type { Niveau, Point, Scene } from '../schemas/dessinScene';
import { niveauSuperieur, niveauxTries } from './niveaux';
import { toit3D } from './toits3d';
import type { Point3 } from './toitures';
import { morceauxDeMur } from './volumes';

/**
 * Façades et coupes (DES-36) : projection orthogonale de la maison sur un plan vertical.
 * x : abscisse le long de la vue (mm, de gauche à droite pour l'observateur) ; y : altitude.
 * Les tracés sont rendus du plus lointain au plus proche (algorithme du peintre).
 */
export type CoteVue = 'nord' | 'sud' | 'est' | 'ouest';
export type GenreTrace = 'mur' | 'baie' | 'porte' | 'toit' | 'pignon' | 'coupe' | 'plancher';
export interface Trace {
  genre: GenreTrace;
  pts: Point[];
  /** Distance à l'observateur (mm) : les plus lointains d'abord. */
  profondeur: number;
}
export interface Elevation {
  traces: Trace[];
  cadre: { x0: number; x1: number; y0: number; y1: number };
  /** Repères d'altitude : sol de chaque niveau, égout et faîtage. */
  reperes: { z: number; libelle: string }[];
}

type Vecteur = { x: number; y: number };
interface Regard {
  /** Direction du regard (horizontale) et droite de l'observateur. */
  d: Vecteur;
  r: Vecteur;
  /** Coupe : seul ce qui est au-delà du plan `p·d = c` est vu ; ce qui le traverse est coupé. */
  c: number | null;
}

const scal = (p: Vecteur, v: Vecteur) => p.x * v.x + p.y * v.y;

/** Façade « sud » : vue depuis le sud, regard vers le nord (nord tourné de `orientationNord`). */
export function regardFacade(cote: CoteVue, orientationNord: number): Regard {
  const n = (orientationNord / 10) * (Math.PI / 180);
  const nord = { x: Math.sin(n), y: -Math.cos(n) };
  const est = { x: Math.cos(n), y: Math.sin(n) };
  const d = {
    sud: nord,
    nord: { x: -nord.x, y: -nord.y },
    est: { x: -est.x, y: -est.y },
    ouest: est,
  }[cote];
  return { d, r: { x: -d.y, y: d.x }, c: null };
}

/** Coupe le long de a → b : a à gauche, regard vers la gauche du tracé. */
export function regardCoupe(a: Point, b: Point): Regard | null {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  if (l < 100) return null;
  const r = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  const d = { x: r.y, y: -r.x };
  return { d, r, c: scal(a, d) };
}

/** Abscisses où une ligne de profondeur `c` traverse un polygone (paires entrée/sortie). */
function traversees(pts: readonly Vecteur[], g: Regard, c: number): [number, number][] {
  const xs: number[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    const [dp, dq] = [scal(p, g.d) - c, scal(q, g.d) - c];
    if (dp === dq || dp < 0 === dq < 0) return;
    const t = dp / (dp - dq);
    xs.push(scal({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }, g.r));
  });
  xs.sort((u, v) => u - v);
  const paires: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) paires.push([xs[i]!, xs[i + 1]!]);
  return paires;
}

const rect = (x0: number, x1: number, y0: number, y1: number): Point[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

/** Murs (pavés autour des baies), baies et portes d'un niveau. */
function mursEtBaies(n: Niveau, g: Regard, out: Trace[]) {
  for (const m of n.murs) {
    for (const p of morceauxDeMur(m, n)) {
      const u = { x: Math.cos(p.angle), y: Math.sin(p.angle) };
      const v = { x: -u.y, y: u.x };
      const coins = [-1, 1].flatMap((i) =>
        [-1, 1].map((j) => ({
          x: p.centre.x + (u.x * p.taille.l * i + v.x * p.taille.p * j) / 2,
          y: p.centre.y + (u.y * p.taille.l * i + v.y * p.taille.p * j) / 2,
        })),
      );
      const contour = [coins[0]!, coins[1]!, coins[3]!, coins[2]!];
      const prof = contour.map((q) => scal(q, g.d));
      const [y0, y1] = [p.centre.z - p.taille.h / 2, p.centre.z + p.taille.h / 2];
      if (g.c !== null && Math.max(...prof) <= g.c) continue;
      if (g.c !== null && Math.min(...prof) < g.c) {
        for (const [x0, x1] of traversees(contour, g, g.c))
          out.push({ genre: 'coupe', pts: rect(x0, x1, y0, y1), profondeur: -Infinity });
        continue;
      }
      const xs = contour.map((q) => scal(q, g.r));
      out.push({
        genre: 'mur',
        pts: rect(Math.min(...xs), Math.max(...xs), y0, y1),
        profondeur: scal(p.centre, g.d),
      });
    }
    // Baies : au fond du tableau, derrière le nu du mur.
    for (const o of n.ouvertures.filter((x) => x.murId === m.id)) {
      const l = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y) || 1;
      const at = (t: number) => ({
        x: m.a.x + ((m.b.x - m.a.x) * t) / l,
        y: m.a.y + ((m.b.y - m.a.y) * t) / l,
      });
      const [a, b] = [at(o.position), at(o.position + o.largeur)];
      const prof = Math.min(scal(a, g.d), scal(b, g.d));
      if (g.c !== null && prof <= g.c) continue;
      const porte = o.type.startsWith('porte') || o.allege === 0;
      out.push({
        genre: porte ? 'porte' : 'baie',
        pts: rect(
          Math.min(scal(a, g.r), scal(b, g.r)),
          Math.max(scal(a, g.r), scal(b, g.r)),
          n.altitude + o.allege,
          n.altitude + o.allege + o.hauteur,
        ),
        profondeur: prof + 1,
      });
    }
  }
}

/** Polygone 3D coupé par le plan (garde ce qui est au-delà), puis projeté. */
function projeter3D(
  pts: readonly Point3[],
  g: Regard,
): { pts: Point[]; profondeur: number } | null {
  let poly = [...pts];
  if (g.c !== null) {
    const c = g.c;
    const garde: Point3[] = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length]!;
      const [dp, dq] = [scal(p, g.d) - c, scal(q, g.d) - c];
      if (dp >= 0) garde.push(p);
      if (dp < 0 !== dq < 0) {
        const t = dp / (dp - dq);
        garde.push({
          x: p.x + (q.x - p.x) * t,
          y: p.y + (q.y - p.y) * t,
          z: p.z + (q.z - p.z) * t,
        });
      }
    });
    poly = garde;
  }
  if (poly.length < 3) return null;
  return {
    pts: poly.map((p) => ({ x: scal(p, g.r), y: p.z })),
    profondeur: poly.reduce((s, p) => s + scal(p, g.d), 0) / poly.length,
  };
}

/** Toit : pans et pignons ; en coupe, le trait du toit tranché. */
function toiture(
  n: Niveau,
  dessus: Niveau | null,
  g: Regard,
  out: Trace[],
  reperes: Elevation['reperes'],
) {
  const t = toit3D(n, dessus);
  if (!t) return;
  reperes.push({ z: t.egout, libelle: 'Égout' }, { z: t.faitage, libelle: 'Faîtage' });
  for (const [genre, liste] of [
    ['toit', t.pans],
    ['pignon', t.murs],
  ] as const)
    for (const poly of liste) {
      const p = projeter3D(poly, g);
      if (p) out.push({ genre, ...p });
      if (g.c === null) continue;
      // Trait de coupe du pan : épaissi de 200 mm vers le haut.
      const coupe = sectionPan(poly, g);
      if (coupe && genre === 'toit')
        out.push({
          genre: 'coupe',
          pts: [
            coupe[0],
            coupe[1],
            { x: coupe[1].x, y: coupe[1].y + 200 },
            { x: coupe[0].x, y: coupe[0].y + 200 },
          ],
          profondeur: -Infinity,
        });
    }
}

function sectionPan(poly: readonly Point3[], g: Regard): [Point, Point] | null {
  const pts: Point[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    const [dp, dq] = [scal(p, g.d) - g.c!, scal(q, g.d) - g.c!];
    if (dp === dq || dp < 0 === dq < 0) return;
    const t = dp / (dp - dq);
    const m = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    pts.push({ x: scal(m, g.r), y: p.z + (q.z - p.z) * t });
  });
  return pts.length >= 2 ? [pts[0]!, pts[1]!] : null;
}

/** Élévation d'une façade (`cote`) ou coupe le long d'un trait (`{ a, b }`). */
export function elevation(s: Scene, vue: CoteVue | { a: Point; b: Point }): Elevation | null {
  const g =
    typeof vue === 'string' ? regardFacade(vue, s.orientationNord) : regardCoupe(vue.a, vue.b);
  if (!g) return null;
  const traces: Trace[] = [];
  const reperes: Elevation['reperes'] = [];
  for (const n of niveauxTries(s)) {
    if (!n.murs.length) continue;
    reperes.push({ z: n.altitude, libelle: n.nom });
    mursEtBaies(n, g, traces);
    // Plancher d'un étage, tranché en coupe là où le trait traverse ses pièces.
    if (g.c !== null && n.altitude > 0)
      for (const p of n.pieces)
        for (const [x0, x1] of traversees(p.contour, g, g.c))
          traces.push({
            genre: 'plancher',
            pts: rect(x0, x1, n.altitude - 200, n.altitude),
            profondeur: -Infinity,
          });
    toiture(n, niveauSuperieur(s, n.id), g, traces, reperes);
  }
  if (!traces.length) return null;
  traces.sort((a, b) => b.profondeur - a.profondeur || 0);
  const xs = traces.flatMap((t) => t.pts.map((p) => p.x));
  const ys = traces.flatMap((t) => t.pts.map((p) => p.y));
  return {
    traces,
    cadre: {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: Math.min(0, ...ys),
      y1: Math.max(...ys),
    },
    reperes: reperes.filter((r, i) => reperes.findIndex((x) => x.z === r.z) === i),
  };
}
