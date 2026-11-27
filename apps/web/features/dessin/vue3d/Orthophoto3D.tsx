'use client';

import { coinsOrthophoto, radians, type Scene } from '@ph/core/dessin';
import { useEffect, useMemo } from 'react';
import { SRGBColorSpace, TextureLoader } from 'three';
import { M } from './unites';

/** Photo aérienne IGN posée au sol sous la maison (DES-35), tournée selon le nord du plan. */
export function Orthophoto3D({ scene, url }: { scene: Scene; url: string | null }) {
  const coins = coinsOrthophoto(scene);
  const texture = useMemo(() => {
    if (!url) return null;
    const t = new TextureLoader().load(url);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [url]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!coins || !texture) return null;
  const l = Math.hypot(coins.hd.x - coins.hg.x, coins.hd.y - coins.hg.y);
  const h = Math.hypot(coins.bg.x - coins.hg.x, coins.bg.y - coins.hg.y);
  const cx = (coins.hg.x + coins.bd.x) / 2;
  const cy = (coins.hg.y + coins.bd.y) / 2;
  // Rotation horaire du plan (y vers le bas) = rotation négative autour de l'axe vertical.
  const angle = -radians(scene.orientationNord);
  return (
    <group position={[M(cx), -0.004, M(cy)]} rotation={[0, angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[M(l), M(h)]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
    </group>
  );
}
