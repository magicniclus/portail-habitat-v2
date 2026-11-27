import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Point } from '../schemas/dessinScene';
import { pointDansPolygone } from './geometrie';
import { murPlein } from './ailesToit';

type Rect = [Point, Point];
/** En dessous (mm), un morceau de terrasse est une chute, pas une terrasse. */
const COTE_MIN = 300;

/**
 * Rectangle de terrasse moins la maison (DES-18) : on trace large, tout autour ; la terrasse
 * garde ce qui est dehors, découpé en rectangles (le moins possible : bandes réunies).
 */
export function rectanglesHorsMaison(n: Niveau, [a, b]: Rect): Rect[] {
  const [x0, x1, y0, y1] = [
    Math.min(a.x, b.x),
    Math.max(a.x, b.x),
    Math.min(a.y, b.y),
    Math.max(a.y, b.y),
  ];
  // Emprise de la maison : pièces et murs prolongés aux angles (les coins sont pleins).
  const polys = [
    ...n.pieces.map((p) => p.contour),
    ...n.murs.filter((m) => m.type !== 'separation' && m.type !== 'poutre').map(murPlein),
  ];
  const coupe = (v: number[], lo: number, hi: number) =>
    [...new Set([lo, hi, ...v.filter((x) => x > lo && x < hi)].map(Math.round))].sort(
      (p, q) => p - q,
    );
  const xs = coupe(
    polys.flat().map((p) => p.x),
    x0,
    x1,
  );
  const ys = coupe(
    polys.flat().map((p) => p.y),
    y0,
    y1,
  );
  const libre = (i: number, j: number) =>
    !polys.some((poly) =>
      pointDansPolygone({ x: (xs[i]! + xs[i + 1]!) / 2, y: (ys[j]! + ys[j + 1]!) / 2 }, poly),
    );
  // Bandes horizontales de cases libres, réunies vers le bas tant qu'elles sont identiques.
  const ouverts = new Map<string, { i0: number; i1: number; j0: number }>();
  const faits: Rect[] = [];
  const fermer = (r: { i0: number; i1: number; j0: number }, j1: number) =>
    faits.push([
      { x: xs[r.i0]!, y: ys[r.j0]! },
      { x: xs[r.i1]!, y: ys[j1]! },
    ]);
  for (let j = 0; j < ys.length - 1; j++) {
    const runs: [number, number][] = [];
    for (let i = 0; i < xs.length - 1; i++)
      if (libre(i, j)) {
        const dernier = runs.at(-1);
        if (dernier && dernier[1] === i) dernier[1] = i + 1;
        else runs.push([i, i + 1]);
      }
    const cles = new Set(runs.map(([i0, i1]) => `${i0}:${i1}`));
    for (const [cle, r] of [...ouverts])
      if (!cles.has(cle)) {
        fermer(r, j);
        ouverts.delete(cle);
      }
    for (const [i0, i1] of runs) {
      const cle = `${i0}:${i1}`;
      if (!ouverts.has(cle)) ouverts.set(cle, { i0, i1, j0: j });
    }
  }
  for (const r of ouverts.values()) fermer(r, ys.length - 1);
  // Aucun morceau jeté (sinon une bande de gazon apparaît entre deux terrasses) ; les morceaux
  // qui partagent un côté entier sont réunis, pour en garder le moins possible.
  return reunir(faits.filter(([p, q]) => q.x - p.x >= 1 && q.y - p.y >= 1));
}

/** Réunit deux à deux les rectangles qui partagent un côté entier, jusqu'à ce qu'il n'y en ait plus. */
function reunir(rects: Rect[]): Rect[] {
  const r = rects.map(([p, q]) => [{ ...p }, { ...q }] as Rect);
  for (let fini = false; !fini;) {
    fini = true;
    for (let i = 0; i < r.length && fini; i++)
      for (let j = i + 1; j < r.length && fini; j++) {
        const [[a, b], [c, d]] = [r[i]!, r[j]!];
        const memesX = a.x === c.x && b.x === d.x && (b.y === c.y || d.y === a.y);
        const memesY = a.y === c.y && b.y === d.y && (b.x === c.x || d.x === a.x);
        if (!memesX && !memesY) continue;
        r[i] = [
          { x: Math.min(a.x, c.x), y: Math.min(a.y, c.y) },
          { x: Math.max(b.x, d.x), y: Math.max(b.y, d.y) },
        ];
        r.splice(j, 1);
        fini = false;
      }
  }
  return r;
}

type Terrasse = Niveau['exterieur']['terrasses'][number];
const estRectangleDroit = (c: readonly Point[]) =>
  c.length === 4 &&
  c.every((p, i) => {
    const q = c[(i + 1) % 4]!;
    return p.x === q.x || p.y === q.y;
  });

function remplacer(n: Niveau, id: string, contour: Point[]): Resultat<Niveau> {
  const xs = contour.map((p) => p.x);
  const ys = contour.map((p) => p.y);
  if (Math.max(...xs) - Math.min(...xs) < COTE_MIN || Math.max(...ys) - Math.min(...ys) < COTE_MIN)
    return echec('PRECONDITION', { message: 'Terrasse trop petite (30 cm au moins).' });
  const arrondi = contour.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  return succes({
    ...n,
    exterieur: {
      ...n.exterieur,
      terrasses: n.exterieur.terrasses.map((t) => (t.id === id ? { ...t, contour: arrondi } : t)),
    },
  });
}

const trouver = (n: Niveau, id: string): Terrasse | undefined =>
  n.exterieur.terrasses.find((t) => t.id === id);

/**
 * Coin d'une terrasse tiré à la souris (DES-18) : un rectangle reste rectangle (ses deux
 * voisins suivent) ; une autre forme bouge ce seul sommet.
 */
export function deplacerSommetTerrasse(
  n: Niveau,
  id: string,
  i: number,
  vers: Point,
): Resultat<Niveau> {
  const t = trouver(n, id);
  if (!t || !t.contour[i]) return echec('INTROUVABLE');
  const c = t.contour.map((p) => ({ ...p }));
  const avant = c[i]!;
  if (estRectangleDroit(c))
    for (const k of [(i + 3) % 4, (i + 1) % 4]) {
      const v = c[k]!;
      if (v.x === avant.x) v.x = vers.x;
      if (v.y === avant.y) v.y = vers.y;
    }
  c[i] = vers;
  return remplacer(n, id, c);
}

/** Côté d'une terrasse poussé ou tiré (DES-18) : ses deux sommets suivent la normale. */
export function deplacerCoteTerrasse(
  n: Niveau,
  id: string,
  i: number,
  vers: Point,
): Resultat<Niveau> {
  const t = trouver(n, id);
  if (!t || !t.contour[i]) return echec('INTROUVABLE');
  const [p, q] = [t.contour[i]!, t.contour[(i + 1) % t.contour.length]!];
  const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  const nrm = { x: -(q.y - p.y) / l, y: (q.x - p.x) / l };
  const d = (vers.x - (p.x + q.x) / 2) * nrm.x + (vers.y - (p.y + q.y) / 2) * nrm.y;
  const bouge = (k: number) => k === i || k === (i + 1) % t.contour.length;
  return remplacer(
    n,
    id,
    t.contour.map((s, k) => (bouge(k) ? { x: s.x + nrm.x * d, y: s.y + nrm.y * d } : s)),
  );
}
