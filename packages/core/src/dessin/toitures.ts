import type { Niveau, Point } from '../schemas/dessinScene';

/**
 * Toiture générée depuis le contour des murs (DES-16, DES-17) : emprise rectangulaire dans
 * le sens du faîtage, pans en 3D, pignons, gouttières, hauteur sous toiture (combles Carrez).
 * Repère local : a le long du faîtage, b en travers, z au-dessus du haut des murs.
 */
export type Toiture = NonNullable<Niveau['toiture']>;
export type TypeToiture = Toiture['type'];
export type Point3 = { x: number; y: number; z: number };

export const LIBELLES_TOITURE: Record<TypeToiture, string> = {
  deux_pans: 'Deux pans',
  quatre_pans: 'Quatre pans',
  croupe: 'Croupe',
  monopente: 'Monopente',
  plate: 'Toit plat',
  mansarde: 'Mansarde',
};
/** Pente par défaut (°) à la création ; un toit plat garde 2 % d'écoulement (≈ 1°). */
export const PENTE_DEFAUT: Record<TypeToiture, number> = {
  deux_pans: 35,
  quatre_pans: 30,
  croupe: 35,
  monopente: 15,
  plate: 1,
  mansarde: 30,
};
/** Pente du brisis d'une mansarde, et part de la profondeur qu'il occupe de chaque côté. */
const BRISIS = { pente: 70, part: 0.18 };
const ACROTERE = 400;

export interface Emprise {
  centre: Point;
  /** Direction du faîtage (unitaire) et perpendiculaire. */
  u: Point;
  v: Point;
  /** Dimensions aux murs (L0 le long du faîtage, P0 en travers) et avec débords (L, P). */
  L0: number;
  P0: number;
  L: number;
  P: number;
  /** Altitude du haut des murs (base du toit). */
  base: number;
  /** Hauteur des murs au-dessus du sol du niveau. */
  hMurs: number;
}

/** Emprise du toit : rectangle englobant les murs dans le sens du faîtage, plus les débords. */
export function empriseToit(n: Niveau, t: Toiture): Emprise | null {
  const pts = n.murs.flatMap((m) => [m.a, m.b]);
  if (pts.length < 3) return null;
  const f = ((t.faitageAngle / 10) * Math.PI) / 180;
  const u = { x: Math.cos(f), y: Math.sin(f) };
  const v = { x: -u.y, y: u.x };
  const as = pts.map((p) => p.x * u.x + p.y * u.y);
  const bs = pts.map((p) => p.x * v.x + p.y * v.y);
  const ep = Math.max(...n.murs.map((m) => m.epaisseur)) / 2;
  const [a0, a1, b0, b1] = [
    Math.min(...as) - ep,
    Math.max(...as) + ep,
    Math.min(...bs) - ep,
    Math.max(...bs) + ep,
  ];
  const [ac, bc] = [(a0 + a1) / 2, (b0 + b1) / 2];
  const hMurs = Math.max(...n.murs.map((m) => m.hauteur));
  return {
    centre: { x: u.x * ac + v.x * bc, y: u.y * ac + v.y * bc },
    u,
    v,
    L0: a1 - a0,
    P0: b1 - b0,
    L: a1 - a0 + 2 * t.debord,
    P: b1 - b0 + 2 * t.debord,
    base: n.altitude + hMurs,
    hMurs,
  };
}

const tan = (deg: number) => Math.tan((deg * Math.PI) / 180);
const penteDe = (t: Toiture) => t.pentes[0]! / 10;

/**
 * Hauteur du toit au-dessus du haut des murs au point local (a, b) ; négative dans les débords.
 * Les pans ont tous la même pente (sauf brisis de mansarde et croupe, plus raide).
 */
export function hauteurLocale(
  t: Toiture,
  e: Pick<Emprise, 'L0' | 'P0'>,
  a: number,
  b: number,
): number {
  const k = tan(penteDe(t));
  const versB = e.P0 / 2 - Math.abs(b);
  const versA = e.L0 / 2 - Math.abs(a);
  switch (t.type) {
    case 'deux_pans':
      return versB * k;
    case 'quatre_pans':
      return Math.min(versB, versA) * k;
    case 'croupe':
      return Math.min(versB * k, versA * k * 2);
    case 'monopente':
      return (b + e.P0 / 2) * k;
    case 'plate':
      return 0;
    case 'mansarde': {
      const largeurBrisis = e.P0 * BRISIS.part;
      const hBrisis = largeurBrisis * tan(BRISIS.pente);
      return versB <= largeurBrisis
        ? versB * tan(BRISIS.pente)
        : hBrisis + (versB - largeurBrisis) * k;
    }
  }
}

/** Repère local → plan + altitude. */
export const versMonde = (e: Emprise, a: number, b: number, z: number): Point3 => ({
  x: e.centre.x + e.u.x * a + e.v.x * b,
  y: e.centre.y + e.u.y * a + e.v.y * b,
  z: e.base + z,
});
/** Plan → repère local. */
export const versLocal = (e: Emprise, p: Point) => {
  const d = { x: p.x - e.centre.x, y: p.y - e.centre.y };
  return { a: d.x * e.u.x + d.y * e.u.y, b: d.x * e.v.x + d.y * e.v.y };
};

/** Aire d'un polygone 3D plan (méthode de Newell), en mm². */
export function aire3D(poly: readonly Point3[]): number {
  let [nx, ny, nz] = [0, 0, 0];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    nx += (p.y - q.y) * (p.z + q.z);
    ny += (p.z - q.z) * (p.x + q.x);
    nz += (p.x - q.x) * (p.y + q.y);
  });
  return Math.hypot(nx, ny, nz) / 2;
}

/** Combles : surface où la hauteur sous toiture atteint 1,80 m (loi Carrez), en mm². */
export function surfaceCarrezCombles(t: Toiture, e: Emprise, pas = 100): number {
  let cellules = 0;
  for (let a = -e.L0 / 2 + pas / 2; a < e.L0 / 2; a += pas)
    for (let b = -e.P0 / 2 + pas / 2; b < e.P0 / 2; b += pas)
      if (e.hMurs + hauteurLocale(t, e, a, b) >= 1_800) cellules++;
  return cellules * pas * pas;
}

export { ACROTERE, BRISIS };
