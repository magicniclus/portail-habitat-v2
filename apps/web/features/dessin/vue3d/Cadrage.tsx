'use client';

import { toit3D, type Niveau } from '@ph/core/dessin';
import { cadreDe } from '../cadre';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { M } from './unites';

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

/**
 * Boutons Zoomer et Dézoomer du rail en 3D : la caméra se rapproche ou s'éloigne de ce qu'elle
 * regarde, dans le même rapport que le zoom du plan.
 */
export function ZoomCamera({ zoom }: { zoom: number }) {
  const lire = useThree((s) => s.get);
  const precedent = useRef(zoom);
  useEffect(() => {
    const rapport = zoom / precedent.current;
    precedent.current = zoom;
    if (rapport === 1) return;
    const etat = lire();
    const controles = etat.controls as unknown as { target: Vector3; update: () => void } | null;
    if (!controles) return;
    // La caméra glisse vers sa nouvelle distance (≈ 0,3 s) au lieu d'y sauter.
    const depart = etat.camera.position.clone();
    const arrivee = controles.target
      .clone()
      .add(depart.clone().sub(controles.target).divideScalar(rapport));
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const debut = performance.now();
    let image = 0;
    const pas = (t: number) => {
      const k = reduit ? 1 : Math.min(1, (t - debut) / 300);
      const doux = 1 - (1 - k) ** 3;
      etat.camera.position.lerpVectors(depart, arrivee, doux);
      controles.update();
      if (k < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [zoom, lire]);
  return null;
}

/** Centre (mètres) et rayon de la maison et de son extérieur : cadrage et ombres. */
export function useCadreMaison(courant: Niveau) {
  return useMemo(() => {
    // Cadre du plan (maison, terrasses, piscines, végétaux), sans sa marge de 3 m.
    const c = cadreDe(courant);
    const [l, h] = [c.l - 6_000, c.h - 6_000];
    // Avec un toit, la maison est plus haute : on cadre aussi le faîtage.
    const t = toit3D(courant);
    const hauteur = t ? Math.max(...t.pans.flat().map((p) => p.z)) - courant.altitude : 2_500;
    return {
      centre: new Vector3(M(c.x + c.l / 2), M(courant.altitude), M(c.y + c.h / 2)),
      rayon: Math.max(4, Math.hypot(l, h, hauteur) / 2000),
    };
  }, [courant]);
}
