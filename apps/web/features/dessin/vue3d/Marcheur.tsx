'use client';

import {
  deplacerVisiteur,
  HAUTEUR_YEUX,
  niveauALaHauteur,
  obstaclesVisite,
  solSousLesPieds,
  type Point,
  type Scene,
} from '@ph/core/dessin';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { M } from './Batiment3D';

/** Vitesse de marche (mm/s), sensibilité du regard (radians par pixel), virage au clavier (rad/s). */
const VITESSE = 1_400;
/** Ctrl (ou Maj) enfoncé : on presse le pas. */
const COURSE = 2.5;
const VIRAGE = 1.8;
export const REGARD = 0.005;
/**
 * Touches de la visite : [avancer, pas de côté, tourner]. Flèches haut et bas pour avancer et
 * reculer, gauche et droite pour tourner ; Z Q S D (ou W A S D) pour marcher et se décaler.
 */
export const TOUCHES: Record<string, [number, number, number]> = {
  z: [1, 0, 0],
  w: [1, 0, 0],
  arrowup: [1, 0, 0],
  s: [-1, 0, 0],
  arrowdown: [-1, 0, 0],
  q: [0, -1, 0],
  a: [0, -1, 0],
  d: [0, 1, 0],
  arrowleft: [0, 0, -1],
  arrowright: [0, 0, 1],
};

export interface Commandes {
  touches: Set<string>;
  joystick: { x: number; y: number };
  lacet: number;
  tangage: number;
  /** Ctrl ou Maj enfoncé : pas accéléré. */
  course: boolean;
}
export interface Visiteur {
  position: Point;
  z: number;
}

/** Caméra à hauteur des yeux, déplacée chaque image : à travers les murs, arrêtée par les meubles, marches. */
export function Marcheur({
  scene,
  commandesRef,
  depart,
  signaler,
}: {
  scene: Scene;
  commandesRef: React.RefObject<Commandes>;
  depart: Visiteur;
  signaler: (v: Visiteur) => void;
}) {
  const visiteur = useRef<Visiteur>(depart);
  // Nouveau départ (changement de niveau dans la barre) : le visiteur y est transporté.
  useEffect(() => {
    visiteur.current = depart;
    signaler(depart);
  }, [depart, signaler]);
  const lire = useThree((s) => s.get);
  const obstacles = useMemo(
    () => new Map(scene.niveaux.map((n) => [n.id, obstaclesVisite(n, true)])),
    [scene],
  );
  useFrame((_, dt) => {
    const c = commandesRef.current;
    const v = visiteur.current;
    let [avant, cote, tourne] = [-c.joystick.y, c.joystick.x, 0];
    for (const t of c.touches) {
      const d = TOUCHES[t];
      if (d) [avant, cote, tourne] = [avant + d[0], cote + d[1], tourne + d[2]];
    }
    const duree = Math.min(dt, 0.1);
    if (tourne) commandesRef.current.lacet += tourne * VIRAGE * duree;
    const pas = duree * VITESSE * (c.course ? COURSE : 1);
    const f = { x: Math.cos(c.lacet), y: Math.sin(c.lacet) };
    if (avant || cote) {
      const d = {
        x: (f.x * avant - f.y * cote) * pas,
        y: (f.y * avant + f.x * cote) * pas,
      };
      const n = niveauALaHauteur(scene, v.z);
      const position = deplacerVisiteur(v.position, d, obstacles.get(n.id) ?? []);
      visiteur.current = { position, z: solSousLesPieds(scene, position, v.z) };
      signaler(visiteur.current);
    }
    const camera = lire().camera;
    const { position, z } = visiteur.current;
    camera.position.set(M(position.x), M(z + HAUTEUR_YEUX), M(position.y));
    camera.rotation.set(c.tangage, Math.atan2(-f.x, -f.y), 0, 'YXZ');
  });
  return null;
}
