'use client';

import type { MorceauMur } from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_PLAN } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, type Material, type Mesh, type MeshStandardMaterial, type Vector3 } from 'three';
import type { Clic3D } from './clic3d';
import { devantLaCamera, HAUTEUR_POUPEE as POUPEE } from './poupee';
import { materiauRevetement, materiauUni } from './textures';
import { geometrieMur } from './geometrieMur';
import { M } from './unites';

/** Opacité des murs en mode transparent : on voit au travers, la matière reste lisible. */
const OPACITE_MUR = 0.22;

/** Face touchée par un clic, d'après son matériau (4 : face A, 5 : face B, sinon la tranche). */
const FACE_CLIQUEE: Record<number, 'a' | 'b'> = { 4: 'a', 5: 'b' };

/** Face sélectionnée : le revêtement reste lisible sous une teinte orange. */
const surlignees = new Map<Material, Material>();
const surlignee = (m: Material) => {
  let c = surlignees.get(m);
  if (!c) {
    const copie = m.clone() as MeshStandardMaterial;
    copie.emissive = new Color(COULEURS_PLAN.murSelection);
    copie.emissiveIntensity = 0.55;
    c = copie;
    surlignees.set(m, c);
  }
  return c;
};

/** Copie translucide d'un matériau (sans écriture de profondeur : rien n'est masqué derrière). */
const translucide = (m: Material) => {
  const c = m.clone();
  c.transparent = true;
  c.opacity = OPACITE_MUR;
  c.depthWrite = false;
  return c;
};

/**
 * Morceau de mur : face A (côté de la normale gauche) et face B avec leur revêtement, tranches
 * neutres.
 * En maison de poupée, un mur tourné vers la caméra descend à 90 cm (DES-33). Murs
 * transparents : translucides, avec un contour net pour les distinguer.
 */
export function MorceauMur3D({
  m,
  centre,
  poupee,
  transparent,
  clic,
}: {
  m: MorceauMur;
  centre: Vector3;
  poupee: boolean;
  transparent: boolean;
  /** Vue 3D éditable : clic = sélection du mur (côté cliqué) ou pose d'une menuiserie. */
  clic?: Clic3D | undefined;
}) {
  const choisi = clic?.selection?.genre === 'mur' && clic.selection.id === m.murId;
  // Côté cliqué en 3D : seule cette face se teinte en orange (sinon contour du mur entier).
  const faceChoisie = choisi ? (clic?.selection?.face ?? null) : null;
  const ref = useRef<Mesh>(null);
  // Prisme exact (angles en onglet, T arrêtés sur la face) : aucune face confondue qui scintille.
  const geometrie = useMemo(
    () => geometrieMur(m.empreinte, m.centre, m.taille.h),
    [m.empreinte, m.centre, m.taille.h],
  );
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  const materiaux = useMemo(() => {
    const tranche = materiauUni(COULEURS_3D.tranche);
    const faces = [
      tranche,
      tranche,
      tranche,
      tranche,
      faceChoisie === 'a' ? surlignee(materiauRevetement(m.faceA)) : materiauRevetement(m.faceA),
      faceChoisie === 'b' ? surlignee(materiauRevetement(m.faceB)) : materiauRevetement(m.faceB),
    ];
    return transparent ? faces.map(translucide) : faces;
  }, [m.faceA, m.faceB, transparent, faceChoisie]);
  // Les copies translucides sont propres à ce mur : libérées quand le mode change.
  useEffect(
    () => () => {
      if (transparent) materiaux.forEach((x) => x.dispose());
    },
    [materiaux, transparent],
  );
  const bas = m.centre.z - m.taille.h / 2;
  useFrame(({ camera }) => {
    const mesh = ref.current;
    if (!mesh) return;
    let h = m.taille.h;
    // Mur entre la caméra et le centre de la maison : on l'abaisse ; un linteau au-dessus
    // de la hauteur abaissée disparaît.
    const devant = poupee && devantLaCamera(camera, centre, m.centre.x, m.centre.y);
    mesh.visible = !(devant && bas >= POUPEE);
    if (devant && bas < POUPEE) h = Math.min(m.taille.h, POUPEE - bas);
    mesh.scale.y = h / m.taille.h;
    mesh.position.y = M(bas + h / 2);
  });
  return (
    <mesh
      ref={ref}
      position={[M(m.centre.x), M(m.centre.z), M(m.centre.y)]}
      geometry={geometrie}
      castShadow={!transparent}
      receiveShadow
      material={materiaux}
      renderOrder={transparent ? 1 : 0}
      onClick={
        clic
          ? (ev: ThreeEvent<MouseEvent>) =>
              clic.cliquer(
                { genre: 'mur', id: m.murId, face: FACE_CLIQUEE[ev.face?.materialIndex ?? -1] },
                ev,
              )
          : undefined
      }
    >
      {choisi && !faceChoisie ? (
        <Edges color={COULEURS_PLAN.murSelection} lineWidth={3} />
      ) : transparent ? (
        <Edges color={COULEURS_PLAN.mur} lineWidth={1.5} />
      ) : null}
    </mesh>
  );
}
