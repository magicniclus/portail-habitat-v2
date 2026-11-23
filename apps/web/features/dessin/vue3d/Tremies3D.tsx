'use client';

import { emprise, murPlein, type Niveau } from '@ph/core/dessin';
import { useEffect, useMemo } from 'react';
import { DoubleSide, Shape, ShapeGeometry } from 'three';
import { M } from './unites';
import { materiauUni } from './textures';
import { COULEURS_3D } from '@ph/ui/tokens';
import { cotes, Segment } from './FormesExterieur3D';

/**
 * Habillage des trémies (DES-15) : joues verticales autour de l'ouverture, du plafond du niveau
 * jusqu'au plancher de l'étage. Par la trémie, on ne voit plus le vide du plancher.
 */
export function HabillageTremies({ n, dessus }: { n: Niveau; dessus: Niveau }) {
  const bas = n.altitude + n.hauteurSousPlafond;
  return n.escaliers.flatMap((e) =>
    cotes(emprise(e)).map(([a, b], i) => (
      <Segment
        key={`${e.id}-${i}`}
        a={a}
        b={b}
        e={30}
        h={dessus.altitude - bas + 6}
        z0={bas - 3}
        couleur={COULEURS_3D.mur}
      />
    )),
  );
}

/**
 * Dalle continue sous tous les murs du niveau (au niveau du sol) : quelle que soit la façon dont
 * les pièces ont été dessinées (murs doublés, pièces accolées), on ne voit jamais le terrain
 * entre deux sols ou sous une porte.
 */
export function DalleSousLesMurs({ n }: { n: Niveau }) {
  const g = useMemo(() => {
    const formes = n.murs
      .filter((m) => m.type !== 'separation')
      .map((m) => {
        const s = new Shape();
        murPlein(m).forEach((p, i) => (i ? s.lineTo(M(p.x), M(p.y)) : s.moveTo(M(p.x), M(p.y))));
        return s;
      });
    return formes.length ? new ShapeGeometry(formes) : null;
  }, [n.murs]);
  useEffect(() => () => g?.dispose(), [g]);
  // Même orientation que les sols (Dalle3D) : visible des deux côtés.
  const materiau = useMemo(() => {
    const m = materiauUni(COULEURS_3D.sol).clone();
    m.side = DoubleSide;
    return m;
  }, []);
  if (!g) return null;
  return (
    <mesh
      geometry={g}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, M(n.altitude) + 0.001, 0]}
      material={materiau}
      receiveShadow
    />
  );
}
