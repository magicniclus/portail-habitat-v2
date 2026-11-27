'use client';

import type { PieceEscalier } from '@ph/core/dessin';
import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape, type Material } from 'three';
import { M } from './unites';

/**
 * Une pièce d'escalier en 3D : boîte (marche droite, limon incliné) ou forme exacte extrudée
 * (marche balancée, palier d'angle d'un escalier tracé).
 */
export function PieceEscalier3D({ p, materiau }: { p: PieceEscalier; materiau: Material }) {
  const forme = useMemo(() => {
    if (!p.empreinte) return null;
    const s = new Shape();
    p.empreinte.forEach((q, i) => (i ? s.lineTo(M(q.x), M(q.y)) : s.moveTo(M(q.x), M(q.y))));
    return new ExtrudeGeometry(s, { depth: M(p.taille.h), bevelEnabled: false });
  }, [p.empreinte, p.taille.h]);
  useEffect(() => () => forme?.dispose(), [forme]);
  if (forme)
    return (
      // Forme couchée (x, y du plan → x, z) ; l'extrusion descend depuis le dessus de la pièce.
      <mesh
        geometry={forme}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, M(p.centre.z + p.taille.h / 2), 0]}
        material={materiau}
        castShadow
        receiveShadow
      />
    );
  return (
    <mesh
      position={[M(p.centre.x), M(p.centre.z), M(p.centre.y)]}
      rotation={[0, -p.angle, p.pente, 'YZX']}
      castShadow
      receiveShadow
      material={materiau}
    >
      <boxGeometry args={[M(p.taille.l), M(p.taille.h), M(p.taille.p)]} />
    </mesh>
  );
}
