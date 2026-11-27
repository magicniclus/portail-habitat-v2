import { expect, it } from 'vitest';
import { niveau as schemaNiveau, type Mur, type Scene } from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { toitureAutomatique } from './commandesToit';
import { pointDansPolygone } from './geometrie';
import { nouvelleScene } from './migrations';
import { detecterPieces, synchroniserPieces } from './pieces';
import type { TypeToiture } from './toitures';
import { defautsToit } from './aidesTestToit';

const ctx = contexteTest();
/** Murs de 20 cm le long d'un contour fermé (axes des murs, mm). */
const contour = (pts: [number, number][], tourner = 0): Mur[] => {
  const r = (tourner * Math.PI) / 180;
  const p = pts.map(([x, y]) => ({
    x: Math.round(x * Math.cos(r) - y * Math.sin(r)),
    y: Math.round(x * Math.sin(r) + y * Math.cos(r)),
  }));
  return p.map((a, i) => ({
    id: ctx.nouvelId('m'),
    a,
    b: p[(i + 1) % p.length]!,
    type: 'mur' as const,
    epaisseur: 200,
    hauteur: 2_500,
    porteur: true,
  })) as Mur[];
};
const rect = (x0: number, y0: number, x1: number, y1: number, t = 0) =>
  contour(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    t,
  );
/** Pièce qui contient le centre du patio du O (6 m, 6 m) : marquée « patio ». */
const PATIO = { x: 6_000, y: 6_000 };
const niv = (id: string, type: 'rdc' | 'etage', altitude: number, murs: Mur[]) => ({
  ...schemaNiveau.parse({ id, nom: id, type, altitude }),
  murs,
  pieces: synchroniserPieces([], detecterPieces(murs), () => ctx.nouvelId('p')).map((p) =>
    murs.length === 16 && pointDansPolygone(PATIO, p.contour)
      ? { ...p, type: 'patio' as const }
      : p,
  ),
});

const FORMES: Record<string, () => Mur[]> = {
  L: () =>
    contour([
      [0, 0],
      [12_000, 0],
      [12_000, 4_000],
      [5_000, 4_000],
      [5_000, 10_000],
      [0, 10_000],
    ]),
  U: () =>
    contour([
      [0, 0],
      [4_000, 0],
      [4_000, 6_000],
      [8_000, 6_000],
      [8_000, 0],
      [12_000, 0],
      [12_000, 10_000],
      [0, 10_000],
    ]),
  T: () =>
    contour([
      [0, 0],
      [12_000, 0],
      [12_000, 4_000],
      [8_000, 4_000],
      [8_000, 10_000],
      [4_000, 10_000],
      [4_000, 4_000],
      [0, 4_000],
    ]),
  H: () =>
    contour([
      [0, 0],
      [4_000, 0],
      [4_000, 4_000],
      [8_000, 4_000],
      [8_000, 0],
      [12_000, 0],
      [12_000, 12_000],
      [8_000, 12_000],
      [8_000, 8_000],
      [4_000, 8_000],
      [4_000, 12_000],
      [0, 12_000],
    ]),
  Z: () =>
    contour([
      [0, 0],
      [8_000, 0],
      [8_000, 4_000],
      [12_000, 4_000],
      [12_000, 10_000],
      [4_000, 10_000],
      [4_000, 6_000],
      [0, 6_000],
    ]),
  croix: () =>
    contour([
      [4_000, 0],
      [8_000, 0],
      [8_000, 4_000],
      [12_000, 4_000],
      [12_000, 8_000],
      [8_000, 8_000],
      [8_000, 12_000],
      [4_000, 12_000],
      [4_000, 8_000],
      [0, 8_000],
      [0, 4_000],
      [4_000, 4_000],
    ]),
  escalier: () =>
    contour([
      [0, 0],
      [4_000, 0],
      [4_000, 3_000],
      [8_000, 3_000],
      [8_000, 6_000],
      [12_000, 6_000],
      [12_000, 10_000],
      [0, 10_000],
    ]),
  biais: () =>
    contour([
      [0, 0],
      [10_000, 0],
      [12_000, 7_000],
      [0, 7_000],
    ]),
  tournee: () => rect(0, 0, 11_000, 7_000, 30),
  'L tourné': () =>
    contour(
      [
        [0, 0],
        [12_000, 0],
        [12_000, 4_000],
        [5_000, 4_000],
        [5_000, 10_000],
        [0, 10_000],
      ],
      25,
    ),
  // O : quatre ailes autour d'un patio (le patio est fermé par les murs).
  O: () => [
    ...rect(0, 0, 12_000, 4_000),
    ...rect(0, 8_000, 12_000, 12_000),
    ...rect(0, 4_000, 4_000, 8_000),
    ...rect(8_000, 4_000, 12_000, 8_000),
  ],
};
/** Rotation de chaque forme (l'étage partiel tourne avec la maison). */
const ROTATION: Record<string, number> = { tournee: 30, 'L tourné': 25 };
const ETAGES: Record<string, (rdc: () => Mur[], nom: string) => Mur[] | null> = {
  'plain-pied': () => null,
  'étage complet': (f) => f(),
  'étage partiel': (_, nom) => rect(0, 0, 4_000, 4_000, ROTATION[nom] ?? 0),
};
const TYPES: TypeToiture[] = [
  'deux_pans',
  'quatre_pans',
  'croupe',
  'monopente',
  'plate',
  'mansarde',
];

it('toits sur des formes variées (L, U, T, H, Z, croix, escalier, biais, tournées, O)', () => {
  const tous: string[] = [];
  for (const [nom, f] of Object.entries(FORMES))
    for (const [etage, e] of Object.entries(ETAGES))
      for (const type of TYPES)
        for (const faitageAngle of [0, 900]) {
          const brute: Scene = {
            ...nouvelleScene(ctx.nouvelId),
            niveaux: [
              niv('n_rdc0', 'rdc', 0, f()),
              ...(e(f, nom) ? [niv('n_et01', 'etage', 2_700, e(f, nom)!)] : []),
            ],
          };
          let s = ok(toitureAutomatique(brute, type));
          s = {
            ...s,
            niveaux: s.niveaux.map((n) =>
              n.toiture ? { ...n, toiture: { ...n.toiture, faitageAngle } } : n,
            ),
          };
          tous.push(
            ...defautsToit(s).map(
              (d) => `${nom} · ${etage} · ${type}${faitageAngle ? ' tourné' : ''} · ${d}`,
            ),
          );
        }
  expect(tous).toEqual([]);
}, 300_000);
