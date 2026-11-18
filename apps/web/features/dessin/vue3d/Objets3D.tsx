'use client';

import { formeObjet3D, objetDuCatalogue, radians, type Objet, type Teinte } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { Edges, TransformControls } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { Group } from 'three';
import type { Action } from '../etat';
import { M } from './Batiment3D';
import { materiauUni } from './textures';

const dixiemes = (rad: number) => Math.round((rad * 1800) / Math.PI);

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

/**
 * Meubles en 3D (DES-22, DES-33) : clic pour choisir, glisser au sol pour déplacer (placement
 * automatique comme en 2D), poignée à 3 anneaux pour la rotation libre (crans de 15°, Maj : libre).
 */
export function Objets3D({
  objets,
  selectionId,
  dispatch,
  glisser,
}: {
  objets: readonly Objet[];
  selectionId: string | null;
  dispatch: Dispatch<Action>;
  /** Démarre un glisser au sol (géré par la scène, qui connaît le plan du sol). */
  glisser: (o: Objet, ev: ThreeEvent<PointerEvent>) => void;
}) {
  const [groupe, setGroupe] = useState<Group | null>(null);
  const [libre, setLibre] = useState(false);
  const choisi = objets.find((o) => o.id === selectionId);
  const geste = useRef<string | null>(null);
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => setLibre(ev.shiftKey);
    window.addEventListener('keydown', touche);
    window.addEventListener('keyup', touche);
    return () => {
      window.removeEventListener('keydown', touche);
      window.removeEventListener('keyup', touche);
    };
  }, []);
  return (
    <>
      {objets.map((o) => (
        <group
          key={o.id}
          ref={o.id === selectionId ? setGroupe : undefined}
          name={`objet-${o.id}`}
          position={[M(o.position.x), M(o.altitude), M(o.position.y)]}
          rotation={[
            radians(o.inclinaison?.x ?? 0),
            -radians(o.rotation),
            radians(o.inclinaison?.y ?? 0),
            'YXZ',
          ]}
          onPointerDown={(ev) => {
            ev.stopPropagation();
            dispatch({ type: 'selectionner', selection: { genre: 'objet', id: o.id } });
            glisser(o, ev);
          }}
        >
          <Volume o={o} choisi={o.id === selectionId} />
        </group>
      ))}
      {choisi && groupe ? (
        <TransformControls
          object={groupe}
          mode="rotate"
          size={0.8}
          rotationSnap={libre ? null : Math.PI / 12}
          onObjectChange={() => {
            geste.current ??= `pivoter-${choisi.id}-${Date.now()}`;
            dispatch({
              type: 'orienterObjet',
              id: choisi.id,
              angles: {
                rotation: -dixiemes(groupe.rotation.y),
                x: dixiemes(groupe.rotation.x),
                y: dixiemes(groupe.rotation.z),
              },
              geste: geste.current,
            });
          }}
          onMouseUp={() => {
            geste.current = null;
            dispatch({ type: 'finGeste' });
          }}
        />
      ) : null}
    </>
  );
}
