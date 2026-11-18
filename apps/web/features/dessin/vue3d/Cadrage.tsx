'use client';

import { toit3D, type Niveau } from '@ph/core/dessin';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
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

/** Centre (mètres) et rayon de la maison au niveau courant : cadrage et ombres. */
export function useCadreMaison(courant: Niveau) {
  return useMemo(() => {
    const pts = courant.murs.flatMap((m) => [m.a, m.b]);
    if (!pts.length) return { centre: new Vector3(0, 0, 0), rayon: 8 };
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Avec un toit, la maison est plus haute : on cadre aussi le faîtage.
    const t = toit3D(courant);
    const hauteur = t ? Math.max(...t.pans.flat().map((p) => p.z)) - courant.altitude : 2_500;
    return {
      centre: new Vector3((x0 + x1) / 2000, courant.altitude / 1000, (y0 + y1) / 2000),
      rayon: Math.max(4, Math.hypot(x1 - x0, y1 - y0, hauteur) / 2000),
    };
  }, [courant]);
}
