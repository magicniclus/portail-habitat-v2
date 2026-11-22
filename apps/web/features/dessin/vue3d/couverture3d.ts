import type { Point3 } from '@ph/core/dessin';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { M } from './unites';

type V = [number, number, number];
const sous = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vect = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V): V => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const scal = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Plan (x, y, z haut) en mm → 3D (x, y haut, z) en mètres. */
const en3D = (p: Point3, dz = 0): V => [M(p.x), M(p.z + dz), M(p.y)];

/** Normale montante d'un pan (Newell), en 3D. */
function normale(pan: readonly V[]): V {
  let n: V = [0, 0, 0];
  pan.forEach((p, i) => {
    const q = pan[(i + 1) % pan.length]!;
    n = [
      n[0] + (p[1] - q[1]) * (p[2] + q[2]),
      n[1] + (p[2] - q[2]) * (p[0] + q[0]),
      n[2] + (p[0] - q[0]) * (p[1] + q[1]),
    ];
  });
  n = unit(n);
  return n[1] < 0 ? [-n[0], -n[1], -n[2]] : n;
}

/**
 * Couverture en volume (DES-16) : dessus des pans avec des coordonnées de texture en mètres
 * alignées sur la pente (rangs de tuiles parallèles à l'égout), et rives (chants et sous-face)
 * d'une épaisseur `epaisseur` (mm) : le toit n'est plus une feuille.
 */
export function geometrieCouverture(
  pans: readonly Point3[][],
  dz: number,
  epaisseur: number,
): { dessus: BufferGeometry; rives: BufferGeometry } {
  const [pos, uv, posR] = [[] as number[], [] as number[], [] as number[]];
  const e = M(epaisseur);
  const tri = (cible: number[], a: V, b: V, c: V, haut: V) => {
    // Sommets dans le sens qui fait face à `haut`.
    const ok = scal(vect(sous(b, a), sous(c, a)), haut) >= 0;
    cible.push(...a, ...(ok ? b : c), ...(ok ? c : b));
    return ok;
  };
  // Arêtes partagées par deux pans (faîtage, arêtier, noue) : pas de chant, sinon sa tranche
  // claire dépasse entre les deux pans et marque le toit d'un pointillé.
  const cle = (a: Point3, b: Point3) =>
    [a, b]
      .map((q) => `${Math.round(q.x)},${Math.round(q.y)},${Math.round(q.z)}`)
      .sort()
      .join('|');
  const usages = new Map<string, number>();
  for (const pan of pans)
    pan.forEach((a, i) => {
      const k = cle(a, pan[(i + 1) % pan.length]!);
      usages.set(k, (usages.get(k) ?? 0) + 1);
    });
  for (const pan of pans) {
    const p = pan.map((q) => en3D(q, dz));
    const n = normale(p);
    // Axe horizontal du pan (le long de l'égout) et axe de la pente.
    const h = Math.hypot(n[0], n[2]) < 1e-6 ? ([1, 0, 0] as V) : unit([-n[2], 0, n[0]]);
    const s = unit(vect(n, h));
    const coord = (q: V) => [scal(q, h), scal(q, s)];
    for (let i = 1; i < p.length - 1; i++) {
      const [a, b, c] = [p[0]!, p[i]!, p[i + 1]!];
      const ok = tri(pos, a, b, c, n);
      uv.push(...coord(a), ...coord(ok ? b : c), ...coord(ok ? c : b));
    }
    // Sous-face et chants, une épaisseur plus bas.
    const bas = p.map((q): V => [q[0], q[1] - e, q[2]]);
    const vers: V = [-n[0], -n[1], -n[2]];
    for (let i = 1; i < bas.length - 1; i++) tri(posR, bas[0]!, bas[i]!, bas[i + 1]!, vers);
    const centre = p.reduce((m, q) => [m[0] + q[0] / p.length, 0, m[2] + q[2] / p.length], [
      0, 0, 0,
    ] as V);
    p.forEach((a, i) => {
      if ((usages.get(cle(pan[i]!, pan[(i + 1) % pan.length]!)) ?? 0) > 1) return;
      const b = p[(i + 1) % p.length]!;
      const [a2, b2] = [bas[i]!, bas[(i + 1) % p.length]!];
      const dehors: V = [(a[0] + b[0]) / 2 - centre[0], 0, (a[2] + b[2]) / 2 - centre[2]];
      tri(posR, a, b, b2, dehors);
      tri(posR, a, b2, a2, dehors);
    });
  }
  const geo = (positions: number[], uvs?: number[]) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    if (uvs) g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    return g;
  };
  return { dessus: geo(pos, uv), rives: geo(posR) };
}

/**
 * Faîtages et arêtiers : arêtes communes à deux pans qui descendent de part et d'autre
 * (les noues, où les pans remontent, n'en ont pas). Reçoivent une faîtière.
 */
export function aretesHautes(pans: readonly Point3[][]): [Point3, Point3][] {
  const proche = (a: Point3, b: Point3) =>
    Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.z - b.z) < 2;
  // Hauteur du plan d'un pan au point (x, y) : plan passant par trois de ses sommets.
  const zSur = (pan: readonly Point3[], x: number, y: number) => {
    const [p0, p1, p2] = [pan[0]!, pan[1]!, pan[2]!];
    const u = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
    const v = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
    const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
    return Math.abs(n.z) < 1e-9 ? p0.z : p0.z - (n.x * (x - p0.x) + n.y * (y - p0.y)) / n.z;
  };
  // Le pan descend-il en s'éloignant de l'arête (vers son propre centre, en plan) ?
  const descend = (pan: readonly Point3[], a: Point3, b: Point3) => {
    const c = {
      x: pan.reduce((s, q) => s + q.x, 0) / pan.length,
      y: pan.reduce((s, q) => s + q.y, 0) / pan.length,
    };
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const d = Math.hypot(c.x - m.x, c.y - m.y) || 1;
    const pas = Math.min(200, d / 2);
    const q = { x: m.x + ((c.x - m.x) / d) * pas, y: m.y + ((c.y - m.y) / d) * pas };
    return zSur(pan, q.x, q.y) < m.z - 1;
  };
  const aretes: [Point3, Point3][] = [];
  pans.forEach((p, i) =>
    p.forEach((a, k) => {
      const b = p[(k + 1) % p.length]!;
      if (Math.hypot(b.x - a.x, b.y - a.y) < 50) return;
      const autre = pans.findIndex(
        (q, j) => j > i && q.some((x) => proche(x, a)) && q.some((x) => proche(x, b)),
      );
      if (autre < 0) return;
      if (descend(p, a, b) && descend(pans[autre]!, a, b)) aretes.push([a, b]);
    }),
  );
  return aretes;
}
