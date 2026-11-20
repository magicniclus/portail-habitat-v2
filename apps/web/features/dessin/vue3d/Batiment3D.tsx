'use client';

import {
  contoursRaccordes,
  dallesDuNiveau,
  limonsEscalier,
  marchesEscalier,
  morceauxDeMur,
  type Dalle,
  type Niveau,
  type Pave,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_ESCALIER, COULEURS_PLAN } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import type { Vector3 } from 'three';
import { DoubleSide, Shape, type Mesh } from 'three';
import type { Clic3D } from './clic3d';
import { Exterieur3D } from './Exterieur3D';
import { Menuiseries3D } from './Menuiseries3D';
import { MorceauMur3D } from './Mur3D';
import { Toit3D } from './Toit3D';
import { M } from './unites';
import { materiauRevetement, materiauUni } from './textures';

export { M };

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

function Dalle3D({ d, dessous, clic }: { d: Dalle; dessous?: boolean; clic?: Clic3D }) {
  const choisi = clic?.selection?.genre === 'piece' && clic.selection.id === d.pieceId;
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
      onClick={
        clic
          ? (ev: ThreeEvent<MouseEvent>) => clic.cliquer({ genre: 'piece', id: d.pieceId }, ev)
          : undefined
      }
    >
      <shapeGeometry args={[forme]} />
      {choisi ? <Edges color={COULEURS_PLAN.murSelection} lineWidth={3} /> : null}
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
  clic,
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
  /** Vue 3D éditable (niveau courant) : clics de sélection et de pose. */
  clic?: Clic3D | undefined;
}) {
  const morceaux = useMemo(() => {
    const contours = contoursRaccordes(n.murs);
    return n.murs.flatMap((m) => morceauxDeMur(m, n, contours.get(m.id)));
  }, [n]);
  const dalles = useMemo(() => dallesDuNiveau(n), [n]);
  const escaliers = useMemo(
    () =>
      n.escaliers.map((e) => ({
        e,
        marches: marchesEscalier(e, n.altitude),
        limons: limonsEscalier(e, n.altitude),
      })),
    [n],
  );
  return (
    <group>
      {morceaux.map((m, i) => (
        <MorceauMur3D
          key={`${m.murId}-${i}`}
          m={m}
          centre={centre}
          poupee={poupee}
          transparent={transparent}
          clic={clic}
        />
      ))}
      {dalles.sols.map((d) => (
        <Dalle3D key={d.pieceId} d={d} {...(clic ? { clic } : {})} />
      ))}
      {plafonds
        ? dalles.plafonds.map((d) => <Dalle3D key={`pl-${d.pieceId}`} d={d} dessous />)
        : null}
      <Menuiseries3D
        n={n}
        portesOuvertes={portesOuvertes}
        poupee={poupee}
        centre={centre}
        clic={clic}
      />
      {toit ? <Toit3D n={n} dessus={dessus} /> : null}
      <Exterieur3D n={n} parcelle={parcelle} />
      {escaliers.map(({ e, marches, limons }) => {
        const matiere = materiauUni(COULEURS_ESCALIER[e.materiau]);
        return (
          <group
            key={e.id}
            onClick={
              clic
                ? (ev: ThreeEvent<MouseEvent>) => clic.cliquer({ genre: 'escalier', id: e.id }, ev)
                : undefined
            }
          >
            {marches.map((p, i) => (
              <PaveMesh key={i} p={p} materiaux={matiere} />
            ))}
            {/* Limon central incliné (dessous ouvert) : lacet puis pente le long de la poutre. */}
            {limons.map((p, i) => (
              <mesh
                key={`l${i}`}
                position={[M(p.centre.x), M(p.centre.z), M(p.centre.y)]}
                rotation={[0, -p.angle, p.pente, 'YZX']}
                castShadow
                receiveShadow
                material={matiere}
              >
                <boxGeometry args={[M(p.taille.l), M(p.taille.h), M(p.taille.p)]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
