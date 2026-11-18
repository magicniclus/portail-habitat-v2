'use client';

import type { Point } from '@ph/core/dessin';
import { useMemo } from 'react';
import { DoubleSide, Shape, ShapeGeometry } from 'three';
import { materiauUni } from './textures';
import { M } from './unites';

export const forme = (pts: readonly Point[]) => {
  const s = new Shape();
  pts.forEach((p, i) => (i ? s.lineTo(M(p.x), M(p.y)) : s.moveTo(M(p.x), M(p.y))));
  return s;
};

/** Pavé d'un point a à un point b (au sol), d'épaisseur e et de hauteur h, posé à z0 (mm). */
export function Segment({
  a,
  b,
  e,
  h,
  z0 = 0,
  couleur,
  transparent = false,
}: {
  a: Point;
  b: Point;
  e: number;
  h: number;
  z0?: number;
  couleur: string;
  transparent?: boolean;
}) {
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  return (
    <mesh
      position={[M((a.x + b.x) / 2), M(z0 + h / 2), M((a.y + b.y) / 2)]}
      rotation={[0, -Math.atan2(b.y - a.y, b.x - a.x), 0]}
      material={materiauUni(couleur, { transparent })}
      castShadow={!transparent}
      receiveShadow
    >
      <boxGeometry args={[M(l), M(h), M(e)]} />
    </mesh>
  );
}
export const cotes = (pts: readonly Point[]) =>
  pts.map((p, i) => [p, pts[(i + 1) % pts.length]!] as const);

/** Dalle horizontale (ShapeGeometry couchée) à la hauteur z (mm). */
export function Dalle({
  pts,
  z,
  couleur,
  opacite,
}: {
  pts: readonly Point[];
  z: number;
  couleur: string;
  opacite?: number;
}) {
  const g = useMemo(() => new ShapeGeometry(forme(pts)), [pts]);
  const m = useMemo(() => {
    const x = materiauUni(couleur).clone();
    x.side = DoubleSide;
    if (opacite) Object.assign(x, { transparent: true, opacity: opacite });
    return x;
  }, [couleur, opacite]);
  return (
    <mesh
      geometry={g}
      material={m}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, M(z), 0]}
      receiveShadow
    />
  );
}

/** Poteau carré (côté `c` mm) de hauteur h, posé à z0 (mm). */
export function Poteau({
  p,
  c,
  h,
  z0 = 0,
  couleur,
}: {
  p: Point;
  c: number;
  h: number;
  z0?: number;
  couleur: string;
}) {
  return (
    <mesh position={[M(p.x), M(z0 + h / 2), M(p.y)]} material={materiauUni(couleur)} castShadow>
      <boxGeometry args={[M(c), M(h), M(c)]} />
    </mesh>
  );
}
