import type { Niveau, Point } from '../schemas/dessinScene';
import {
  aire3D,
  empriseToit,
  hauteurLocale,
  versLocal,
  versMonde,
  type Emprise,
  type Point3,
  type Toiture,
} from './toitures';
import { mursLocaux, pansLocaux, type Loc } from './pansToit';
import type { Pave } from './volumes';

/** Pavé incliné (fenêtre de toit) : `inclinaison` autour de son axe l, en radians. */
export interface PaveIncline extends Pave {
  inclinaison: number;
}

export interface Toit3D {
  emprise: Emprise;
  pans: Point3[][];
  /** Pignons, mur haut d'une monopente, acrotères d'un toit plat. */
  murs: Point3[][];
  gouttieres: [Point3, Point3][];
  fenetres: PaveIncline[];
  cheminees: Pave[];
  lucarnes: Pave[];
  /** Surface de couverture (mm²) et longueur de gouttières (mm). */
  surface: number;
  longueurGouttieres: number;
}

/** Pente locale au point : direction de la plus grande pente (vers le bas) et angle. */
function penteEn(t: Toiture, e: Emprise, a: number, b: number) {
  const d = 10;
  const ga = (hauteurLocale(t, e, a + d, b) - hauteurLocale(t, e, a - d, b)) / (2 * d);
  const gb = (hauteurLocale(t, e, a, b + d) - hauteurLocale(t, e, a, b - d)) / (2 * d);
  const g = Math.hypot(ga, gb);
  // Vers le bas, dans le plan : -grad, ramené en x, y.
  const bas = g ? { x: -(e.u.x * ga + e.v.x * gb) / g, y: -(e.u.y * ga + e.v.y * gb) / g } : e.v;
  return { pente: Math.atan(g), angle: Math.atan2(bas.y, bas.x) - Math.PI / 2, bas };
}

export function toit3D(n: Niveau): Toit3D | null {
  const t = n.toiture;
  if (!t) return null;
  const e = empriseToit(n, t);
  if (!e) return null;
  const z = (a: number, b: number) => hauteurLocale(t, e, a, b);
  const pans = pansLocaux(t, e).map((poly) => poly.map(([a, b]) => versMonde(e, a, b, z(a, b))));
  const [L, P] = [e.L / 2, e.P / 2];
  const bords: Loc[][] =
    t.type === 'plate'
      ? []
      : t.type === 'monopente'
        ? [
            [
              [-L, -P],
              [L, -P],
            ],
          ]
        : t.type === 'quatre_pans' || t.type === 'croupe'
          ? [
              [
                [-L, -P],
                [L, -P],
              ],
              [
                [L, -P],
                [L, P],
              ],
              [
                [L, P],
                [-L, P],
              ],
              [
                [-L, P],
                [-L, -P],
              ],
            ]
          : [
              [
                [-L, -P],
                [L, -P],
              ],
              [
                [-L, P],
                [L, P],
              ],
            ];
  const gouttieres = bords.map(
    ([p, q]) =>
      [
        versMonde(e, p![0], p![1], z(p![0], p![1])),
        versMonde(e, q![0], q![1], z(q![0], q![1])),
      ] as [Point3, Point3],
  );
  const zMax = Math.max(...pans.flat().map((p) => p.z)) - e.base;
  const local = (p: Point) => versLocal(e, p);
  return {
    emprise: e,
    pans,
    murs: mursLocaux(t, e),
    gouttieres,
    fenetres: t.fenetresToit.map((f) => {
      const { a, b } = local(f.position);
      const s = penteEn(t, e, a, b);
      return {
        centre: { x: f.position.x, y: f.position.y, z: e.base + z(a, b) + 40 },
        taille: { l: f.largeur, p: f.hauteur, h: 60 },
        angle: s.angle,
        inclinaison: s.pente,
      };
    }),
    cheminees: t.cheminees.map((c) => {
      const { a, b } = local(c.position);
      const bas = z(a, b) - 300;
      const haut = zMax + 600;
      return {
        centre: { x: c.position.x, y: c.position.y, z: e.base + (bas + haut) / 2 },
        taille: { l: c.largeur, p: c.profondeur, h: haut - bas },
        angle: Math.atan2(e.u.y, e.u.x),
      };
    }),
    lucarnes: t.lucarnes.map((l) => {
      const { a, b } = local(l.position);
      const s = penteEn(t, e, a, b);
      const h = 1_300;
      return {
        centre: { x: l.position.x, y: l.position.y, z: e.base + z(a, b) + h / 2 - 200 },
        taille: { l: l.largeur, p: 1_200, h },
        angle: s.angle,
      };
    }),
    surface: Math.round(pans.reduce((s, p) => s + aire3D(p), 0)),
    longueurGouttieres: Math.round(
      gouttieres.reduce((s, [p, q]) => s + Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z), 0),
    ),
  };
}
