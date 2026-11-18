'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';

/** Direction de la caméra à l'ouverture : de trois quarts, au-dessus de la maison. */
const DIRECTION = new Vector3(-0.45, 0.75, 0.85).normalize();

/**
 * Cadre toute la maison, quelle que soit la forme de la zone (téléphone en portrait compris) :
 * à l'ouverture, au changement de niveau et au bouton « Ajuster ».
 */
export function Cadrage({ centre, rayon, cle }: { centre: Vector3; rayon: number; cle: string }) {
  const lire = useThree((s) => s.get);
  const controlesPrets = useThree((s) => s.controls !== null);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useEffect(() => {
    const etat = lire();
    const camera = etat.camera as PerspectiveCamera;
    const controles = etat.controls as unknown as { target: Vector3; update: () => void } | null;
    const vertical = MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
    const distance = (rayon * 1.1) / Math.sin(Math.min(vertical, horizontal) / 2);
    const cible = new Vector3(centre.x, centre.y + 1, centre.z);
    camera.position.copy(cible).addScaledVector(DIRECTION, distance);
    camera.far = distance * 6;
    camera.updateProjectionMatrix();
    if (controles) {
      controles.target.copy(cible);
      controles.update();
    } else camera.lookAt(cible);
    // Recadrer seulement sur demande, pas à chaque mouvement de la maison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, controlesPrets, aspect]);
  return null;
}
