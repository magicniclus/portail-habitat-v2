'use client';

import { revetementDuTerrain, type Scene } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { useMemo } from 'react';
import { DoubleSide, Shape } from 'three';
import { materiauGazon } from './gazon';
import { materiauRevetement } from './textures';
import { M } from './unites';

/**
 * Sol en 3D : un terrain neutre tout autour et, dans la parcelle, son revêtement (gazon par
 * défaut, gravier, pavés, dalles…). Terrasses, allées et piscine se posent dessus.
 */
export function Terrain3D({
  scene,
  centre,
  cote,
}: {
  scene: Pick<Scene, 'terrain'>;
  /** Centre (m) et côté (m) du sol neutre. */
  centre: { x: number; z: number };
  cote: number;
}) {
  const parcelle = scene.terrain?.parcelle;
  const revetement = revetementDuTerrain(scene);
  const forme = useMemo(() => {
    if (!parcelle || parcelle.length < 3) return null;
    const s = new Shape();
    parcelle.forEach((p, i) => (i ? s.lineTo(M(p.x), M(p.y)) : s.moveTo(M(p.x), M(p.y))));
    return s;
  }, [parcelle]);
  const materiau = useMemo(() => {
    if (!revetement) return null;
    if (revetement.famille === 'gazon') return materiauGazon();
    const m = materiauRevetement(revetement, COULEURS_3D.terrain).clone();
    m.side = DoubleSide;
    return m;
  }, [revetement]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centre.x, -0.01, centre.z]} receiveShadow>
        <planeGeometry args={[cote, cote]} />
        <meshStandardMaterial color={COULEURS_3D.terrain} roughness={1} />
      </mesh>
      {forme && materiau ? (
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -0.004, 0]}
          receiveShadow
          material={materiau}
        >
          <shapeGeometry args={[forme]} />
        </mesh>
      ) : null}
    </>
  );
}
