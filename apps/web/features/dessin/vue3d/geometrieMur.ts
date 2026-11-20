import type { Point } from '@ph/core/dessin';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { M } from './unites';

/** Matériaux du mur, dans l'ordre d'une boîte : 0 tranches, 4 face A, 5 face B. */
const [TRANCHE, FACE_A, FACE_B] = [0, 4, 5];

/**
 * Prisme d'un morceau de mur (DES-33) d'après son emprise exacte au sol, centré sur `centre`
 * (mm) et sur sa hauteur `h` : angles en onglet et jonctions en T sans aucun recouvrement, donc
 * sans faces confondues qui scintillent. Faces A et B gardent leur revêtement ; coordonnées de
 * texture en mètres (motifs à l'échelle).
 */
export function geometrieMur(
  empreinte: readonly Point[],
  centre: Point,
  h: number,
): BufferGeometry {
  type P2 = [number, number];
  const local = (p: Point): P2 => [M(p.x - centre.x), M(p.y - centre.y)];
  const [gd, gf, df, dd] = [0, 1, 2, 3].map((i) => local(empreinte[i]!)) as [P2, P2, P2, P2];
  const y = M(h) / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const geo = new BufferGeometry();
  // Centre de l'emprise : sert à orienter chaque face vers l'extérieur.
  const cx = (gd[0] + gf[0] + df[0] + dd[0]) / 4;
  const cz = (gd[1] + gf[1] + df[1] + dd[1]) / 4;
  const quad = (pts: [number, number, number][], uv: [number, number][], groupe: number) => {
    const [a, b, c] = pts as [
      [number, number, number],
      [number, number, number],
      [number, number, number],
    ];
    // Normale (b - a) × (c - a), comparée à la direction sortante.
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ];
    const m = pts.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0]);
    const sortant = n[0]! * (m[0]! - cx) + n[1]! * m[1]! + n[2]! * (m[2]! - cz) > 0;
    const ordre = sortant ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    geo.addGroup(positions.length / 3, 6, groupe);
    for (const i of ordre) {
      positions.push(...pts[i]!);
      uvs.push(...uv[i]!);
    }
  };
  const cote = (p: [number, number], q: [number, number], groupe: number) => {
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    quad(
      [
        [p[0], -y, p[1]],
        [q[0], -y, q[1]],
        [q[0], y, q[1]],
        [p[0], y, p[1]],
      ],
      [
        [0, 0],
        [l, 0],
        [l, 2 * y],
        [0, 2 * y],
      ],
      groupe,
    );
  };
  const dessus = (hauteur: number) =>
    quad(
      [gd, gf, df, dd].map((p) => [p[0], hauteur, p[1]] as [number, number, number]),
      [gd, gf, df, dd].map((p) => [p[0], p[1]] as [number, number]),
      TRANCHE,
    );
  cote(gd, gf, FACE_A);
  cote(dd, df, FACE_B);
  cote(gd, dd, TRANCHE);
  cote(gf, df, TRANCHE);
  dessus(y);
  dessus(-y);
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}
