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
import { useMemo, useRef } from 'react';
import { M } from './Batiment3D';

/** Vitesse de marche (mm/s) et sensibilité du regard (radians par pixel). */
const VITESSE = 1_400;
export const REGARD = 0.005;
export const TOUCHES: Record<string, [number, number]> = {
  z: [1, 0],
  w: [1, 0],
  arrowup: [1, 0],
  s: [-1, 0],
  arrowdown: [-1, 0],
  q: [0, -1],
  a: [0, -1],
  arrowleft: [0, -1],
  d: [0, 1],
  arrowright: [0, 1],
};

export interface Commandes {
  touches: Set<string>;
  joystick: { x: number; y: number };
  lacet: number;
  tangage: number;
}
export interface Visiteur {
  position: Point;
  z: number;
}

/** Caméra à hauteur des yeux, déplacée chaque image : à travers les murs, arrêtée par les meubles, marches. */
export function Marcheur({
  scene,
  commandes,
  depart,
  signaler,
}: {
  scene: Scene;
  commandes: React.RefObject<Commandes>;
  depart: Visiteur;
  signaler: (v: Visiteur) => void;
}) {
  const visiteur = useRef<Visiteur>(depart);
  const lire = useThree((s) => s.get);
  const obstacles = useMemo(
    () => new Map(scene.niveaux.map((n) => [n.id, obstaclesVisite(n, true)])),
    [scene],
  );
  useFrame((_, dt) => {
    const c = commandes.current;
    const v = visiteur.current;
    let [avant, cote] = [-c.joystick.y, c.joystick.x];
    for (const t of c.touches) {
      const d = TOUCHES[t];
      if (d) [avant, cote] = [avant + d[0], cote + d[1]];
    }
    const pas = Math.min(dt, 0.1) * VITESSE;
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
