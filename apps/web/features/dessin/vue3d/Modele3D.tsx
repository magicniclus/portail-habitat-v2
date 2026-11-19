'use client';

import { modele3D, type Objet } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { Edges, useGLTF } from '@react-three/drei';
import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { Box3, Mesh, Vector3 } from 'three';
import { M } from './Batiment3D';

/** Fichier introuvable ou illisible : la forme simple reste affichée. */
class SiErreur extends Component<{ secours: ReactNode; children: ReactNode }, { erreur: boolean }> {
  override state = { erreur: false };
  static getDerivedStateFromError() {
    return { erreur: true };
  }
  override render() {
    return this.state.erreur ? this.props.secours : this.props.children;
  }
}

/**
 * Vrai modèle 3D (D88) ajusté aux dimensions de l'objet : largeur, profondeur et hauteur de
 * l'inspecteur, posé au sol, centré. Ombres portées comme les formes simples.
 */
function ModeleCharge({
  url,
  d,
  choisi,
}: {
  url: string;
  d: Objet['dimensions'];
  choisi: boolean;
}) {
  // Pas de Draco (fichiers compressés en meshopt) : aucun décodeur chargé depuis un CDN.
  const { scene } = useGLTF(url, false, true);
  const { objet, echelle, decalage } = useMemo(() => {
    const copie = scene.clone(true);
    copie.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const b = new Box3().setFromObject(copie);
    const t = b.getSize(new Vector3());
    return {
      objet: copie,
      echelle: [M(d.l) / (t.x || 1), M(d.h) / (t.y || 1), M(d.p) / (t.z || 1)] as const,
      decalage: [-(b.min.x + t.x / 2), -b.min.y, -(b.min.z + t.z / 2)] as const,
    };
  }, [scene, d.l, d.p, d.h]);
  return (
    <>
      <group scale={echelle}>
        <primitive object={objet} position={decalage} />
      </group>
      {choisi ? (
        <mesh position={[0, M(d.h) / 2, 0]}>
          <boxGeometry args={[M(d.l), M(d.h), M(d.p)]} />
          <meshBasicMaterial visible={false} />
          <Edges color={COULEURS_3D.selection} lineWidth={2} />
        </mesh>
      ) : null}
    </>
  );
}

/** Objet avec un vrai modèle : chargé à la demande, forme simple en attendant ; sinon `secours`. */
export function Modele3D({
  o,
  choisi,
  secours,
}: {
  o: Objet;
  choisi: boolean;
  secours: ReactNode;
}) {
  const url = modele3D(o.catalogueId);
  if (!url) return secours;
  return (
    <SiErreur secours={secours}>
      <Suspense fallback={secours}>
        <ModeleCharge url={url} d={o.dimensions} choisi={choisi} />
      </Suspense>
    </SiErreur>
  );
}
