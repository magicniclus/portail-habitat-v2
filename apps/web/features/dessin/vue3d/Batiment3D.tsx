'use client';

import {
  dallesDuNiveau,
  marchesEscalier,
  morceauxDeMur,
  type Dalle,
  type MorceauMur,
  type Niveau,
  type Pave,
} from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Vector3 } from 'three';
import { DoubleSide, Shape, type Mesh } from 'three';
import { Menuiseries3D } from './Menuiseries3D';
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

/**
 * Morceau de mur : face A (+z local) et face B (-z) avec leur revêtement, tranches neutres.
 * En maison de poupée, un mur tourné vers la caméra descend à 90 cm (DES-33).
 */
function MorceauMur3D({ m, centre, poupee }: { m: MorceauMur; centre: Vector3; poupee: boolean }) {
  const ref = useRef<Mesh>(null);
  const materiaux = useMemo(() => {
    const tranche = materiauUni(COULEURS_3D.tranche);
    return [
      tranche,
      tranche,
      tranche,
      tranche,
      materiauRevetement(m.faceA),
      materiauRevetement(m.faceB),
    ];
  }, [m.faceA, m.faceB]);
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
      castShadow
      receiveShadow
      material={materiaux}
    >
      <boxGeometry args={[M(m.taille.l), M(m.taille.h), M(m.taille.p)]} />
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
  plafonds,
  portesOuvertes = false,
}: {
  n: Niveau;
  centre: Vector3;
  poupee: boolean;
  plafonds: boolean;
  /** Visite : vantaux des portes ouverts pour passer. */
  portesOuvertes?: boolean;
}) {
  const morceaux = useMemo(() => n.murs.flatMap((m) => morceauxDeMur(m, n)), [n]);
  const dalles = useMemo(() => dallesDuNiveau(n), [n]);
  const marches = useMemo(() => n.escaliers.flatMap((e) => marchesEscalier(e, n.altitude)), [n]);
  const bois = materiauUni(COULEURS_3D.principal);
  return (
    <group>
      {morceaux.map((m, i) => (
        <MorceauMur3D key={`${m.murId}-${i}`} m={m} centre={centre} poupee={poupee} />
      ))}
      {dalles.sols.map((d) => (
        <Dalle3D key={d.pieceId} d={d} />
      ))}
      {plafonds
        ? dalles.plafonds.map((d) => <Dalle3D key={`pl-${d.pieceId}`} d={d} dessous />)
        : null}
      <Menuiseries3D n={n} portesOuvertes={portesOuvertes} poupee={poupee} centre={centre} />
      {marches.map((p, i) => (
        <PaveMesh key={i} p={p} materiaux={bois} />
      ))}
    </group>
  );
}
