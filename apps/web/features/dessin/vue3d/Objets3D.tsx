'use client';

import { formeObjet3D, objetDuCatalogue, radians, type Objet, type Teinte } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M } from './Batiment3D';
import { Modele3D } from './Modele3D';
import { materiauUni } from './textures';

/** Prisme triangulaire (toit à deux pans) : faîtage le long de x, base p, hauteur h (en m). */
function GeometriePrisme({ l, p, h }: { l: number; p: number; h: number }) {
  const g = useMemo(() => {
    const s = new Shape();
    s.moveTo(-p / 2, -h / 2);
    s.lineTo(p / 2, -h / 2);
    s.lineTo(0, h / 2);
    s.closePath();
    const e = new ExtrudeGeometry(s, { depth: l, bevelEnabled: false });
    e.rotateY(Math.PI / 2);
    e.translate(-l / 2, 0, 0);
    return e;
  }, [l, p, h]);
  useEffect(() => () => g.dispose(), [g]);
  return <primitive object={g} attach="geometry" />;
}

/** Boîte aux arêtes adoucies (coussins, accoudoirs) : dimensions et rayon en m. */
function GeometrieDouce({ l, p, h, r }: { l: number; p: number; h: number; r: number }) {
  const g = useMemo(() => new RoundedBoxGeometry(l, h, p, 3, r), [l, p, h, r]);
  useEffect(() => () => g.dispose(), [g]);
  return <primitive object={g} attach="geometry" />;
}

function Volume({ o, choisi }: { o: Objet; choisi: boolean }) {
  const c = objetDuCatalogue(o.catalogueId);
  // Couleurs choisies dans l'inspecteur : façades, plan de travail, poignées.
  const choisies: Partial<Record<Teinte, string | undefined>> = {
    principal: o.materiaux.facade,
    tissu: o.materiaux.facade,
    plan: o.materiaux.plan,
    poignee: o.materiaux.poignee,
  };
  const teinte = (t: Teinte) => choisies[t] ?? COULEURS_3D[t];
  return formeObjet3D(c?.symbole ?? 'rectangle', o.dimensions, c?.style).map((f, i) => (
    <mesh
      key={i}
      // Repère de l'objet : x largeur, y profondeur (→ z 3D), z hauteur (→ y 3D).
      position={[M(f.centre.x), M(f.centre.z), M(f.centre.y)]}
      rotation={[-(f.pente ?? 0), 0, 0]}
      scale={f.forme === 'sphere' ? [M(f.taille.l), M(f.taille.h), M(f.taille.p)] : 1}
      material={materiauUni(teinte(f.teinte), { transparent: f.teinte === 'verre' })}
      castShadow
      receiveShadow
    >
      {f.forme === 'boite' && f.arrondi ? (
        <GeometrieDouce l={M(f.taille.l)} p={M(f.taille.p)} h={M(f.taille.h)} r={M(f.arrondi)} />
      ) : f.forme === 'boite' ? (
        <boxGeometry args={[M(f.taille.l), M(f.taille.h), M(f.taille.p)]} />
      ) : f.forme === 'sphere' ? (
        <sphereGeometry args={[0.5, 24, 16]} />
      ) : f.forme === 'prisme' ? (
        <GeometriePrisme l={M(f.taille.l)} p={M(f.taille.p)} h={M(f.taille.h)} />
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
