'use client';

import {
  dallesDuNiveau,
  marchesEscalier,
  morceauxDeMur,
  type Dalle,
  type MorceauMur,
  type Niveau,
  type Pave,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_PLAN } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Vector3 } from 'three';
import { DoubleSide, Shape, type Material, type Mesh } from 'three';
import { Exterieur3D } from './Exterieur3D';
import { Menuiseries3D } from './Menuiseries3D';
import { Toit3D } from './Toit3D';
import { devantLaCamera, HAUTEUR_POUPEE } from './poupee';
import { M } from './unites';
import { materiauRevetement, materiauUni } from './textures';

export { M };
/** Hauteur des murs abaissés en « maison de poupée ». */
const POUPEE = HAUTEUR_POUPEE;

function PaveMesh({ p, materiaux }: { p: Pave; materiaux: Mesh['material'] }) {
  return (
    <mesh
      position={[M(p.centre.x), M(p.centre.z), M(p.centre.y)]}
      rotation={[0, -p.angle, 0]}
      castShadow
      receiveShadow
      material={materiaux}
    >
      <boxGeometry args={[M(p.taille.l), M(p.taille.h), M(p.taille.p)]} />
    </mesh>
  );
}

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
 * Morceau de mur : face A (+z local) et face B (-z) avec leur revêtement, tranches neutres.
 * En maison de poupée, un mur tourné vers la caméra descend à 90 cm (DES-33). Murs
 * transparents : translucides, avec un contour net pour les distinguer.
 */
function MorceauMur3D({
  m,
  centre,
  poupee,
  transparent,
}: {
  m: MorceauMur;
  centre: Vector3;
  poupee: boolean;
  transparent: boolean;
}) {
  const ref = useRef<Mesh>(null);
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
      rotation={[0, -m.angle, 0]}
      castShadow={!transparent}
      receiveShadow
      material={materiaux}
      renderOrder={transparent ? 1 : 0}
    >
      <boxGeometry args={[M(m.taille.l), M(m.taille.h), M(m.taille.p)]} />
      {transparent ? <Edges color={COULEURS_PLAN.mur} lineWidth={1.5} /> : null}
    </mesh>
  );
}

function Dalle3D({ d, dessous }: { d: Dalle; dessous?: boolean }) {
  const forme = useMemo(() => {
    // Forme dans le plan XY en mètres, couchée ensuite à l'horizontale (y du plan → z 3D).
    const s = new Shape();
    d.contour.forEach((p, i) => (i ? s.lineTo(M(p.x), M(p.y)) : s.moveTo(M(p.x), M(p.y))));
    return s;
  }, [d.contour]);
  const materiau = useMemo(() => {
    const m = materiauRevetement(d.revetement, COULEURS_3D.sol).clone();
    m.side = DoubleSide;
    return m;
  }, [d.revetement]);
  return (
    <mesh
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, M(d.z) + (dessous ? -0.002 : 0.002), 0]}
      receiveShadow
      material={materiau}
    >
      <shapeGeometry args={[forme]} />
    </mesh>
  );
}

/** Un niveau en 3D : murs découpés, sols, plafonds (visite), escaliers. */
export function Niveau3D({
  n,
  centre,
  poupee,
  transparent = false,
  plafonds,
  portesOuvertes = false,
  toit = false,
  dessus = null,
  parcelle = null,
}: {
  n: Niveau;
  centre: Vector3;
  poupee: boolean;
  /** Murs translucides à contour net (menu Rendu). */
  transparent?: boolean;
  plafonds: boolean;
  /** Visite : vantaux des portes ouverts pour passer. */
  portesOuvertes?: boolean;
  /** Toiture du niveau affichée, et niveau du dessus (parties sans étage seulement). */
  toit?: boolean;
  dessus?: Niveau | null;
  /** Parcelle de la scène (affichée avec l'extérieur du niveau). */
  parcelle?: Point[] | null;
}) {
  const morceaux = useMemo(() => n.murs.flatMap((m) => morceauxDeMur(m, n)), [n]);
  const dalles = useMemo(() => dallesDuNiveau(n), [n]);
  const marches = useMemo(() => n.escaliers.flatMap((e) => marchesEscalier(e, n.altitude)), [n]);
  const bois = materiauUni(COULEURS_3D.principal);
  return (
    <group>
      {morceaux.map((m, i) => (
        <MorceauMur3D
          key={`${m.murId}-${i}`}
          m={m}
          centre={centre}
          poupee={poupee}
          transparent={transparent}
        />
      ))}
      {dalles.sols.map((d) => (
        <Dalle3D key={d.pieceId} d={d} />
      ))}
      {plafonds
        ? dalles.plafonds.map((d) => <Dalle3D key={`pl-${d.pieceId}`} d={d} dessous />)
        : null}
      <Menuiseries3D n={n} portesOuvertes={portesOuvertes} poupee={poupee} centre={centre} />
      {toit ? <Toit3D n={n} dessus={dessus} /> : null}
      <Exterieur3D n={n} parcelle={parcelle} />
      {marches.map((p, i) => (
        <PaveMesh key={i} p={p} materiaux={bois} />
      ))}
    </group>
  );
}
