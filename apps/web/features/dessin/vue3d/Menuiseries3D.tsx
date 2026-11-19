'use client';

import {
  CATALOGUE_OUVERTURES,
  materiauDe,
  menuiserie3D,
  pointSurMur,
  type Matiere,
  type Niveau,
  type Ouverture,
} from '@ph/core/dessin';
import { COULEURS_3D, TEINTE_MENUISERIE } from '@ph/ui/tokens';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group, Vector3 } from 'three';
import { devantLaCamera, HAUTEUR_POUPEE } from './poupee';
import { materiauUni } from './textures';
import { M } from './unites';

const couleurDe = (o: Ouverture, m: Matiere) =>
  m === 'verre'
    ? COULEURS_3D.verre
    : m === 'poignee' || m === 'rail'
      ? COULEURS_3D.quincaillerie
      : m === 'seuil'
        ? COULEURS_3D.seuil
        : (o.couleur ?? TEINTE_MENUISERIE[materiauDe(o)]);

/**
 * Portes et fenêtres en 3D (DES-13, DES-33) : dormant, vantaux pleins ou vitrés (verre clair),
 * petits bois, poignées, volets, rails. `portesOuvertes` : vantaux des portes ouverts (visite).
 */
export function Menuiseries3D({
  n,
  portesOuvertes,
  poupee,
  centre,
}: {
  n: Niveau;
  portesOuvertes: boolean;
  poupee: boolean;
  centre: Vector3;
}) {
  const menuiseries = useMemo(
    () =>
      n.ouvertures.flatMap((o) => {
        const mur = n.murs.find((m) => m.id === o.murId);
        if (!mur) return [];
        const porte = CATALOGUE_OUVERTURES[o.type].famille === 'porte';
        const pieces = menuiserie3D(o, mur, n, portesOuvertes && porte ? 0.9 : 0);
        const milieu = pointSurMur(mur, o.position + o.largeur / 2);
        return [{ o, pieces, milieu }];
      }),
    [n, portesOuvertes],
  );
  const groupes = useRef<(Group | null)[]>([]);
  // Maison de poupée : la menuiserie d'un mur avant abaissé disparaît avec lui.
  useFrame(({ camera }) => {
    menuiseries.forEach(({ o, milieu }, i) => {
      const g = groupes.current[i];
      if (!g) return;
      g.visible = !(
        poupee &&
        o.allege + o.hauteur > HAUTEUR_POUPEE &&
        devantLaCamera(camera, centre, milieu.x, milieu.y)
      );
    });
  });
  return (
    <group>
      {menuiseries.map(({ o, pieces }, j) => (
        <group key={o.id} ref={(g) => void (groupes.current[j] = g)}>
          {pieces.map((p, i) => (
            <mesh
              key={i}
              position={[M(p.centre.x), M(p.centre.z), M(p.centre.y)]}
              rotation={[0, -p.angle, 0]}
              castShadow={p.matiere !== 'verre'}
              receiveShadow
              material={materiauUni(couleurDe(o, p.matiere), {
                transparent: p.matiere === 'verre',
              })}
            >
              <boxGeometry args={[M(p.taille.l), M(p.taille.h), M(p.taille.p)]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
