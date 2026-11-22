import type { Point } from '../schemas/dessinScene';

/** Géométrie plane de Dessin. Calculs en flottants, résultats stockés arrondis au millimètre. */

/** Dixièmes de degré (rotations du plan) → radians. */
export const radians = (dixiemes: number) => (dixiemes / 10) * (Math.PI / 180);

/** Point d'un repère tourné de `dixiemes` autour de `origine` → plan (y vers le bas). */
export function versRepere(origine: Point, dixiemes: number): (p: Point) => Point {
  const a = radians(dixiemes);
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return (p) => ({ x: origine.x + p.x * c - p.y * s, y: origine.y + p.x * s + p.y * c });
}

export const arrondir = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) });
export const distance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);
export const memePoint = (a: Point, b: Point, tolerance = 0): boolean =>
  distance(a, b) <= tolerance;
export const milieu = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Projection de `p` sur le segment [a, b] ; `t` dans [0, 1]. */
export function projeter(p: Point, a: Point, b: Point): { point: Point; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { point: { x: a.x + t * dx, y: a.y + t * dy }, t };
}

export const distancePointSegment = (p: Point, a: Point, b: Point): number =>
  distance(p, projeter(p, a, b).point);

/** Intersection des segments [a, b] et [c, d], extrémités comprises ; `null` si parallèles ou disjoints. */
export function intersectionSegments(a: Point, b: Point, c: Point, d: Point): Point | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (den === 0) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  const eps = 1e-9;
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

/** Aire signée (formule du lacet), en mm². */
export function aireSignee(poly: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

export const aire = (poly: readonly Point[]): number => Math.abs(aireSignee(poly));

export function perimetre(poly: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) s += distance(poly[i]!, poly[(i + 1) % poly.length]!);
  return s;
}

export function centroide(poly: readonly Point[]): Point {
  const n = poly.length;
  return {
    x: poly.reduce((s, p) => s + p.x, 0) / n,
    y: poly.reduce((s, p) => s + p.y, 0) / n,
  };
}

/** Lancer de rayon : vrai si `p` est strictement à l'intérieur (les bords comptent de façon arbitraire). */
export function pointDansPolygone(p: Point, poly: readonly Point[]): boolean {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      dedans = !dedans;
  }
  return dedans;
}

/**
 * Décale chaque côté vers l'intérieur de `distances[i]` (côté i = poly[i] → poly[i+1]).
 * Sert à passer du contour des axes des murs au contour intérieur d'une pièce.
 */
export function decalerVersInterieur(
  poly: readonly Point[],
  distances: readonly number[],
): Point[] {
  const n = poly.length;
  const sens = aireSignee(poly) > 0 ? 1 : -1;
  const lignes = poly.map((p, i) => {
    const q = poly[(i + 1) % n]!;
    const l = distance(p, q);
    const nx = (-(q.y - p.y) / l) * sens;
    const ny = ((q.x - p.x) / l) * sens;
    const d = distances[i] ?? 0;
    return { p: { x: p.x + nx * d, y: p.y + ny * d }, dir: { x: q.x - p.x, y: q.y - p.y } };
  });
  return poly.map((sommet, i) => {
    const l1 = lignes[(i - 1 + n) % n]!;
    const l2 = lignes[i]!;
    const den = l1.dir.x * l2.dir.y - l1.dir.y * l2.dir.x;
    if (Math.abs(den) < 1e-9) {
      // Côtés alignés : on reporte simplement le sommet sur la ligne décalée.
      return { x: sommet.x + (l2.p.x - poly[i]!.x), y: sommet.y + (l2.p.y - poly[i]!.y) };
    }
    const t = ((l2.p.x - l1.p.x) * l2.dir.y - (l2.p.y - l1.p.y) * l2.dir.x) / den;
    return { x: l1.p.x + t * l1.dir.x, y: l1.p.y + t * l1.dir.y };
  });
}

/** Maj pendant un tracé (DES-06) : le point s'aligne à l'horizontale ou à la verticale. */
export function orthogonal(origine: Point, p: Point): Point {
  return Math.abs(p.x - origine.x) >= Math.abs(p.y - origine.y)
    ? { x: Math.round(p.x), y: origine.y }
    : { x: origine.x, y: Math.round(p.y) };
}

/**
 * Aimant doux des angles courants (tous les 45° : droit, demi-droit…) : près d'un de ces angles
 * (à `tolerance` degrés), le point s'y accroche à la même distance ; sinon il reste libre.
 */
export function aimanterAngle(origine: Point, p: Point, tolerance = 8): Point {
  const [dx, dy] = [p.x - origine.x, p.y - origine.y];
  const l = Math.hypot(dx, dy);
  if (!l) return p;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const proche = Math.round(angle / 45) * 45;
  if (Math.abs(angle - proche) > tolerance) return { x: Math.round(p.x), y: Math.round(p.y) };
  const r = (proche * Math.PI) / 180;
  return {
    x: Math.round(origine.x + Math.cos(r) * l) + 0,
    y: Math.round(origine.y + Math.sin(r) * l) + 0,
  };
}

/** Point à `longueur` mm de `origine`, dans la direction de `vers` (longueur tapée, DES-06). */
export function pointALongueur(origine: Point, vers: Point, longueur: number): Point | null {
  const d = distance(origine, vers);
  if (d === 0 || longueur <= 0) return null;
  return arrondir({
    x: origine.x + ((vers.x - origine.x) / d) * longueur,
    y: origine.y + ((vers.y - origine.y) / d) * longueur,
  });
}
