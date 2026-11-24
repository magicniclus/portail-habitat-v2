import type { Point } from '../schemas/dessinScene';
import type { Point3 } from './toitures';

/**
 * Réunion des toits des ailes (DES-16) : chaque pan perd les parties qui passent sous le pan
 * d'une autre aile. Calcul exact en plan : un pan est convexe et plan ; là où un autre pan
 * est plus haut, c'est son emprise coupée par un demi-plan (la différence de deux plans est
 * linéaire). On soustrait ces morceaux convexes un à un (découpage de Sutherland-Hodgman).
 */
type Plan = { a: number; b: number; c: number };
/** Demi-plan { p : nx·x + ny·y + d > 0 }. */
type DemiPlan = { nx: number; ny: number; d: number };

const EPS = 1;

/** Plan z = a·x + b·y + c d'un pan (non vertical) ; `null` s'il est vertical ou dégénéré. */
function planDe(p: readonly Point3[]): Plan | null {
  for (let i = 1; i < p.length - 1; i++) {
    const [o, u, v] = [p[0]!, p[i]!, p[i + 1]!];
    const [ux, uy, uz] = [u.x - o.x, u.y - o.y, u.z - o.z];
    const [vx, vy, vz] = [v.x - o.x, v.y - o.y, v.z - o.z];
    const nz = ux * vy - uy * vx;
    if (Math.abs(nz) < 1e-6) continue;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const a = -nx / nz;
    const b = -ny / nz;
    return { a, b, c: o.z - a * o.x - b * o.y };
  }
  return null;
}

const aire = (p: readonly Point[]) =>
  Math.abs(
    p.reduce((s, q, i) => {
      const r = p[(i + 1) % p.length]!;
      return s + q.x * r.y - r.x * q.y;
    }, 0),
  ) / 2;

/** Partie du polygone convexe dans le demi-plan (Sutherland-Hodgman). */
function couper(poly: readonly Point[], h: DemiPlan): Point[] {
  const f = (p: Point) => h.nx * p.x + h.ny * p.y + h.d;
  const out: Point[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    const [fp, fq] = [f(p), f(q)];
    if (fp >= 0) out.push(p);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  });
  return out;
}
const oppose = (h: DemiPlan): DemiPlan => ({ nx: -h.nx, ny: -h.ny, d: -h.d });

/** Demi-plans dont l'intersection est le polygone convexe (côté intérieur). */
function demiPlans(poly: readonly Point[]): DemiPlan[] {
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
  return poly.flatMap((p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    const [nx, ny] = [-(q.y - p.y), q.x - p.x];
    if (Math.hypot(nx, ny) < 1e-9) return [];
    const h = { nx, ny, d: -(nx * p.x + ny * p.y) };
    return [nx * cx + ny * cy + h.d >= 0 ? h : oppose(h)];
  });
}

/** Morceaux convexes de `p` hors du convexe `c`. */
function soustraire(p: Point[], c: readonly Point[]): Point[][] {
  const hors: Point[][] = [];
  let reste = [p];
  for (const h of demiPlans(c)) {
    const suite: Point[][] = [];
    for (const q of reste) {
      const dehors = couper(q, oppose(h));
      if (dehors.length >= 3 && aire(dehors) > EPS) hors.push(dehors);
      const dedans = couper(q, h);
      if (dedans.length >= 3 && aire(dedans) > EPS) suite.push(dedans);
    }
    reste = suite;
  }
  return hors;
}

/**
 * Pans visibles du toit : pour chaque aile, ses pans privés des zones où un pan d'une autre
 * aile passe au-dessus, avec l'aile qui les porte. Les pans verticaux sont gardés tels quels.
 */
export function pansVisibles(
  parAile: readonly (readonly Point3[][])[],
): { pan: Point3[]; aile: number }[] {
  const plans = parAile.map((pans) => pans.map((p) => ({ p, plan: planDe(p) })));
  const resultat: { pan: Point3[]; aile: number }[] = [];
  plans.forEach((pans, i) => {
    const autres = plans.filter((_, j) => j !== i).flat();
    for (const { p, plan } of pans) {
      if (!plan) {
        resultat.push({ pan: p, aile: i });
        continue;
      }
      let morceaux: Point[][] = [p.map(({ x, y }) => ({ x, y }))];
      for (const o of autres) {
        if (!o.plan) continue;
        // Là où l'autre pan est plus haut que celui-ci : son emprise ∩ demi-plan.
        const h = { nx: o.plan.a - plan.a, ny: o.plan.b - plan.b, d: o.plan.c - plan.c - EPS };
        const dessus = couper(
          o.p.map(({ x, y }) => ({ x, y })),
          h,
        );
        if (dessus.length < 3 || aire(dessus) <= EPS) continue;
        morceaux = morceaux.flatMap((m) => soustraire(m, dessus));
      }
      for (const m of morceaux)
        resultat.push({
          pan: m.map(({ x, y }) => ({ x, y, z: plan.a * x + plan.b * y + plan.c })),
          aile: i,
        });
    }
  });
  return resultat;
}
