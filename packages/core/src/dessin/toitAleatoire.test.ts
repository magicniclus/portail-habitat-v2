import { expect, it } from 'vitest';
import { niveau as schemaNiveau, type Mur, type Scene } from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { defautsToit } from './aidesTestToit';
import { toitureAutomatique } from './commandesToit';
import { nouvelleScene } from './migrations';
import { detecterPieces, synchroniserPieces } from './pieces';
import type { TypeToiture } from './toitures';

/**
 * Maisons tirées au hasard (DES-16) : le toit doit tenir sur toute maison, pas seulement sur
 * les formes connues. Assemblages de 2 à 4 rectangles (cases d'un mètre), tournés ou non, avec
 * ou sans étage (complet, partiel). Tirage reproductible : la graine figure dans le message.
 */
const ctx = contexteTest();
const CASE = 1_000;
const N = 12;

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function hasard(graine: number) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cases pleines d'un assemblage de rectangles qui se touchent, trous bouchés. */
function cases(r: () => number): boolean[][] {
  const g = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
  const entier = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const poser = (x0: number, y0: number, w: number, h: number) => {
    for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) g[x]![y] = true;
  };
  poser(entier(2, 4), entier(2, 4), entier(3, 6), entier(3, 6));
  for (let k = entier(1, 3); k > 0; k--)
    for (let essai = 0; essai < 50; essai++) {
      const [w, h] = [entier(2, 5), entier(2, 5)];
      const [x0, y0] = [entier(0, N - w), entier(0, N - h)];
      let touche = false;
      for (let x = x0 - 1; x <= x0 + w; x++)
        for (let y = y0; y < y0 + h; y++) touche ||= Boolean(g[x]?.[y]);
      for (let y = y0 - 1; y <= y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) touche ||= Boolean(g[x]?.[y]);
      if (touche) {
        poser(x0, y0, w, h);
        break;
      }
    }
  // Trous bouchés : tout ce qui n'est pas relié au bord est plein.
  const dehors = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
  const pile: [number, number][] = [];
  for (let i = 0; i < N; i++) pile.push([i, 0], [i, N - 1], [0, i], [N - 1, i]);
  while (pile.length) {
    const [x, y] = pile.pop()!;
    if (x < 0 || y < 0 || x >= N || y >= N || dehors[x]![y] || g[x]![y]) continue;
    dehors[x]![y] = true;
    pile.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return g.map((l, x) => l.map((v, y) => v || !dehors[x]![y]));
}

/** Contour des cases pleines (une boucle), côtés alignés fusionnés, en mm. */
function contour(g: boolean[][]): [number, number][] {
  const plein = (x: number, y: number) => Boolean(g[x]?.[y]);
  const suite = new Map<string, [number, number]>();
  for (let x = 0; x < N; x++)
    for (let y = 0; y < N; y++) {
      if (!plein(x, y)) continue;
      // Bords orientés (plein à gauche) entre une case pleine et une vide.
      if (!plein(x, y - 1)) suite.set(`${x},${y}`, [x + 1, y]);
      if (!plein(x + 1, y)) suite.set(`${x + 1},${y}`, [x + 1, y + 1]);
      if (!plein(x, y + 1)) suite.set(`${x + 1},${y + 1}`, [x, y + 1]);
      if (!plein(x - 1, y)) suite.set(`${x},${y + 1}`, [x, y]);
    }
  const [debut] = suite.keys();
  const pts: [number, number][] = [];
  let cle = debut!;
  do {
    const [x, y] = cle.split(',').map(Number) as [number, number];
    pts.push([x, y]);
    const n = suite.get(cle)!;
    cle = `${n[0]},${n[1]}`;
  } while (cle !== debut && pts.length < 400);
  // Sommets alignés retirés.
  return pts
    .filter((p, i) => {
      const [a, c] = [pts[(i - 1 + pts.length) % pts.length]!, pts[(i + 1) % pts.length]!];
      return (p[0] - a[0]) * (c[1] - p[1]) - (p[1] - a[1]) * (c[0] - p[0]) !== 0;
    })
    .map(([x, y]) => [x * CASE, y * CASE]);
}

const murs = (pts: [number, number][], angle: number): Mur[] => {
  const r = (angle * Math.PI) / 180;
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
const niv = (id: string, type: 'rdc' | 'etage', altitude: number, m: Mur[]) => ({
  ...schemaNiveau.parse({ id, nom: id, type, altitude }),
  murs: m,
  pieces: synchroniserPieces([], detecterPieces(m), () => ctx.nouvelId('p')),
});
const TYPES: TypeToiture[] = [
  'deux_pans',
  'quatre_pans',
  'croupe',
  'monopente',
  'plate',
  'mansarde',
];

it('toits sur des maisons tirées au hasard : aucun défaut', () => {
  const tous: string[] = [];
  for (let graine = 1; graine <= 100; graine++) {
    const r = hasard(graine);
    const g = cases(r);
    const angle = r() < 0.3 ? Math.round(r() * 40) : 0;
    const choix = r();
    // Étage : aucun, complet, ou une partie (les cases pleines d'un rectangle tiré dedans).
    let etage: boolean[][] | null = null;
    if (choix > 0.66) etage = g;
    else if (choix > 0.33) {
      const sous = g.map((l) => l.map(() => false));
      const pleines = g.flatMap((l, x) => l.flatMap((v, y) => (v ? [[x, y] as const] : [])));
      const [x0, y0] = pleines[Math.floor(r() * pleines.length)]!;
      for (let x = x0; x < x0 + 3; x++)
        for (let y = y0; y < y0 + 3; y++) if (g[x]?.[y]) sous[x]![y] = true;
      etage = sous;
    }
    for (const type of TYPES)
      for (const faitageAngle of [0, 900]) {
        const brute: Scene = {
          ...nouvelleScene(ctx.nouvelId),
          niveaux: [
            niv('n_rdc0', 'rdc', 0, murs(contour(g), angle)),
            ...(etage ? [niv('n_et01', 'etage', 2_700, murs(contour(etage), angle))] : []),
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
          ...defautsToit(s).map((d) => `graine ${graine} · ${type} ${faitageAngle} · ${d}`),
        );
      }
  }
  expect(tous).toEqual([]);
}, 600_000);
