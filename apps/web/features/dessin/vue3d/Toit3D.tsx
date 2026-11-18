'use client';

import { toit3D, type Niveau, type Point3 } from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_COUVERTURE } from '@ph/ui/tokens';
import { useMemo } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three';
import { materiauUni } from './textures';
import { M } from './unites';

/** Polygone plan convexe → triangles en éventail (mètres, y vers le haut). */
function geometrie(polys: readonly Point3[][]): BufferGeometry {
  const pos: number[] = [];
  for (const p of polys)
    for (let i = 1; i < p.length - 1; i++)
      for (const q of [p[0]!, p[i]!, p[i + 1]!]) pos.push(M(q.x), M(q.z), M(q.y));
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Toiture en 3D (DES-16, DES-17) : pans à la couleur de la couverture, pignons en façade,
 * gouttières, fenêtres de toit inclinées, cheminées, lucarnes.
 */
export function Toit3D({ n, dessus }: { n: Niveau; dessus: Niveau | null }) {
  const t = useMemo(() => toit3D(n, dessus), [n, dessus]);
  const pans = useMemo(() => (t ? geometrie(t.pans) : null), [t]);
  const murs = useMemo(() => (t ? geometrie(t.murs) : null), [t]);
  const couverture = useMemo(() => {
    const famille = n.toiture?.couverture.famille ?? 'tuile';
    const m = materiauUni(
      COULEURS_COUVERTURE[famille as keyof typeof COULEURS_COUVERTURE] ?? COULEURS_COUVERTURE.tuile,
    ).clone();
    m.side = DoubleSide;
    return m;
  }, [n.toiture?.couverture.famille]);
  const facade = useMemo(() => {
    const m = materiauUni(COULEURS_COUVERTURE.facade).clone();
    m.side = DoubleSide;
    return m;
  }, []);
  if (!t || !pans || !murs) return null;
  return (
    <group>
      <mesh geometry={pans} material={couverture} castShadow receiveShadow />
      <mesh geometry={murs} material={facade} castShadow receiveShadow />
      {t.gouttieres.map(([a, b], i) => {
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        return (
          <mesh
            key={`g${i}`}
            position={[M((a.x + b.x) / 2), M((a.z + b.z) / 2) - 0.05, M((a.y + b.y) / 2)]}
            rotation={[0, -Math.atan2(b.y - a.y, b.x - a.x), Math.PI / 2]}
            material={materiauUni(COULEURS_3D.quincaillerie)}
          >
            <cylinderGeometry args={[0.06, 0.06, M(l), 10]} />
          </mesh>
        );
      })}
      {t.fenetres.map((f, i) => (
        <mesh
          key={`f${i}`}
          position={[M(f.centre.x), M(f.centre.z), M(f.centre.y)]}
          rotation={[f.inclinaison, -f.angle, 0, 'YXZ']}
          material={materiauUni(COULEURS_3D.verre)}
        >
          <boxGeometry args={[M(f.taille.l), M(f.taille.h), M(f.taille.p)]} />
        </mesh>
      ))}
      {[
        ...t.cheminees.map((c) => ({ c, brique: true })),
        ...t.lucarnes.map((c) => ({ c, brique: false })),
      ].map(({ c, brique }, i) => (
        <mesh
          key={`c${i}`}
          position={[M(c.centre.x), M(c.centre.z), M(c.centre.y)]}
          rotation={[0, -c.angle, 0]}
          material={materiauUni(brique ? COULEURS_COUVERTURE.brique : COULEURS_COUVERTURE.facade)}
          castShadow
        >
          <boxGeometry args={[M(c.taille.l), M(c.taille.h), M(c.taille.p)]} />
        </mesh>
      ))}
    </group>
  );
}
