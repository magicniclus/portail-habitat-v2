'use client';

import type { MorceauMur } from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_PLAN } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Material, Mesh, Vector3 } from 'three';
import type { Selection3D } from './selection3d';
import { devantLaCamera, HAUTEUR_POUPEE as POUPEE } from './poupee';
import { materiauRevetement, materiauUni } from './textures';
import { geometrieMur } from './geometrieMur';
import { M } from './unites';

const ORIGINE = { x: 0, y: 0 };

/** Opacité des murs en mode transparent : on voit au travers, la matière reste lisible. */
const OPACITE_MUR = 0.22;

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
  selection,
}: {
  m: MorceauMur;
  centre: Vector3;
  poupee: boolean;
  transparent: boolean;
  /** Sélection faite en 2D (la 3D ne sert qu'à voir). */
  selection?: Selection3D;
}) {
  const choisi = selection?.genre === 'mur' && selection.id === m.murId;
  // Pan cliqué en 3D : surligné à part (SurlignagePan) ; sinon contour du mur entier.
  const faceChoisie = choisi ? (selection?.face ?? null) : null;
  const ref = useRef<Mesh>(null);
  // Prisme exact (angles en onglet, T arrêtés sur la face) : aucune face confondue qui scintille.
  // Sommets dans les coordonnées du plan (et non autour du centre du morceau) : deux morceaux
  // voisins calculent exactement les mêmes arêtes, sans fissure au rendu.
  const geometrie = useMemo(
    () => geometrieMur(m.empreinte, ORIGINE, m.taille.h, m.visibles),
    [m.empreinte, m.taille.h, m.visibles],
  );
  useEffect(() => () => geometrie.dispose(), [geometrie]);
  const materiaux = useMemo(() => {
    const tranche = materiauUni(COULEURS_3D.tranche);
    const faces = [
      tranche,
      tranche,
      tranche,
      tranche,
      materiauRevetement(m.faceA),
      materiauRevetement(m.faceB),
    ];
    return transparent ? faces.map(translucide) : faces;
  }, [m.faceA, m.faceB, transparent]);
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
    // Tout le mur décide d'un bloc (pas morceau par morceau) : abaissé en entier ou pas du tout.
    const pivot = m.milieuMur ?? m.centre;
    const devant = poupee && devantLaCamera(camera, centre, pivot.x, pivot.y);
    mesh.visible = !(devant && bas >= POUPEE);
    if (devant && bas < POUPEE) h = Math.min(m.taille.h, POUPEE - bas);
    mesh.scale.y = h / m.taille.h;
    mesh.position.y = M(bas + h / 2);
  });
  return (
    <mesh
      ref={ref}
      position={[0, M(m.centre.z), 0]}
      geometry={geometrie}
      castShadow={!transparent}
      receiveShadow
      material={materiaux}
      renderOrder={transparent ? 1 : 0}
    >
      {choisi && !faceChoisie ? (
        <Edges color={COULEURS_PLAN.murSelection} lineWidth={3} />
      ) : transparent ? (
        <Edges color={COULEURS_PLAN.mur} lineWidth={1.5} />
      ) : null}
    </mesh>
  );
}
