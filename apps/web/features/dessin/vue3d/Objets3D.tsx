'use client';

import { formeObjet3D, objetDuCatalogue, radians, type Objet, type Teinte } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { M } from './Batiment3D';
import { Modele3D } from './Modele3D';
import { materiauUni } from './textures';

function Volume({ o, choisi }: { o: Objet; choisi: boolean }) {
  const c = objetDuCatalogue(o.catalogueId);
  const teinte = (t: Teinte) =>
    t === 'principal' ? (o.materiaux.facade ?? COULEURS_3D.principal) : COULEURS_3D[t];
  return formeObjet3D(c?.symbole ?? 'rectangle', o.dimensions).map((f, i) => (
    <mesh
      key={i}
      // Repère de l'objet : x largeur, y profondeur (→ z 3D), z hauteur (→ y 3D).
      position={[M(f.centre.x), M(f.centre.z), M(f.centre.y)]}
      material={materiauUni(teinte(f.teinte), { transparent: f.teinte === 'verre' })}
      castShadow
      receiveShadow
    >
      {f.forme === 'boite' ? (
        <boxGeometry args={[M(f.taille.l), M(f.taille.h), M(f.taille.p)]} />
      ) : (
        <cylinderGeometry args={[M(f.taille.l / 2), M(f.taille.l / 2), M(f.taille.h), 24]} />
      )}
      {/* Sélection : contours en couleur d'accent, les teintes restent visibles. */}
      {choisi ? <Edges color={COULEURS_3D.selection} lineWidth={2} /> : null}
    </mesh>
  ));
}

/** Meubles en 3D (DES-22, DES-33) : à voir seulement ; le meuble choisi en 2D est souligné. */
export function Objets3D({
  objets,
  selectionId,
}: {
  objets: readonly Objet[];
  selectionId: string | null;
}) {
  return objets.map((o) => (
    <group
      key={o.id}
      name={`objet-${o.id}`}
      position={[M(o.position.x), M(o.altitude), M(o.position.y)]}
      rotation={[
        radians(o.inclinaison?.x ?? 0),
        -radians(o.rotation),
        radians(o.inclinaison?.y ?? 0),
        'YXZ',
      ]}
    >
      <Modele3D
        o={o}
        choisi={o.id === selectionId}
        secours={<Volume o={o} choisi={o.id === selectionId} />}
      />
    </group>
  ));
}
