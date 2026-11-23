'use client';

import {
  contoursRaccordes,
  dallesDuNiveau,
  habillageEscalier,
  type MatiereEscalier,
  morceauxDeMur,
  murSousEtage,
  type Dalle,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_ELEVATION, COULEURS_ESCALIER, COULEURS_PLAN } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { useMemo } from 'react';
import type { Vector3 } from 'three';
import { DoubleSide, Path, Shape } from 'three';
import type { Selection3D } from './selection3d';
import { Exterieur3D } from './Exterieur3D';
import { Menuiseries3D } from './Menuiseries3D';
import { MorceauMur3D } from './Mur3D';
import { SurlignagePan } from './SurlignagePan';
import { Toit3D } from './Toit3D';
import { M } from './unites';
import { materiauRevetement, materiauUni } from './textures';

export { M };

function Dalle3D({
  d,
  dessous,
  selection,
}: {
  d: Dalle;
  dessous?: boolean;
  selection?: Selection3D;
}) {
  const cible = d.zoneId
    ? ({ genre: 'zone', id: d.zoneId } as const)
    : ({ genre: 'piece', id: d.pieceId } as const);
  const choisi = selection?.genre === cible.genre && selection.id === cible.id;
  const forme = useMemo(() => {
    // Forme dans le plan XY en mètres, couchée ensuite à l'horizontale (y du plan → z 3D).
    const s = new Shape();
    d.contour.forEach((p, i) => (i ? s.lineTo(M(p.x), M(p.y)) : s.moveTo(M(p.x), M(p.y))));
    // Trémies d'escalier : le sol ou le plafond est percé.
    for (const t of d.trous ?? []) {
      const h = new Path();
      t.forEach((p, i) => (i ? h.lineTo(M(p.x), M(p.y)) : h.moveTo(M(p.x), M(p.y))));
      s.holes.push(h);
    }
    return s;
  }, [d.contour, d.trous]);
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
      {choisi ? <Edges color={COULEURS_PLAN.murSelection} lineWidth={3} /> : null}
    </mesh>
  );
}

const SANS_TREMIE: Point[][] = [];

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
  tremies = SANS_TREMIE,
  selection,
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
  /** Trémies du sol de ce niveau (escaliers du niveau du dessous). */
  tremies?: Point[][];
  /** Sélection faite en 2D, montrée sur le niveau courant (la 3D ne sert qu'à voir). */
  selection?: Selection3D;
}) {
  const morceaux = useMemo(() => {
    const contours = contoursRaccordes(n.murs);
    // Un niveau au-dessus : les murs montent jusqu'à son plancher (façade continue).
    const rehausse = dessus ? dessus.altitude - n.altitude - n.hauteurSousPlafond : 0;
    // Seuls les murs qui portent l'étage montent jusqu'à son plancher.
    return n.murs.flatMap((m) =>
      morceauxDeMur(m, n, contours.get(m.id), dessus && murSousEtage(m, dessus) ? rehausse : 0),
    );
  }, [n, dessus]);
  // Clé stable : les trémies sont recalculées à chaque affichage, les dalles seulement si elles changent.
  const cleTremies = JSON.stringify(tremies);
  const dalles = useMemo(
    () => dallesDuNiveau(n, JSON.parse(cleTremies) as Point[][]),
    [n, cleTremies],
  );
  const escaliers = useMemo(
    () =>
      n.escaliers.map((e) => ({
        e,
        pieces: habillageEscalier(e, n.altitude),
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
          selection={selection}
        />
      ))}
      {dalles.sols.map((d) => (
        <Dalle3D key={d.zoneId ?? d.pieceId} d={d} selection={selection} />
      ))}
      {plafonds
        ? dalles.plafonds.map((d) => <Dalle3D key={`pl-${d.pieceId}`} d={d} dessous />)
        : null}
      <SurlignagePan n={n} selection={selection} />
      <Menuiseries3D
        n={n}
        portesOuvertes={portesOuvertes}
        poupee={poupee}
        centre={centre}
        selection={selection}
      />
      {toit ? <Toit3D n={n} dessus={dessus} /> : null}
      {/* La limite de parcelle est au sol : seulement au rez-de-chaussée (pas une copie par étage). */}
      <Exterieur3D n={n} parcelle={n.altitude === 0 ? parcelle : null} />
      {escaliers.map(({ e, pieces }) => {
        // Marches et limons dans le matériau choisi, socle enduit.
        const teinte: Record<MatiereEscalier, string> = {
          marche: COULEURS_ESCALIER[e.materiau],
          limon: COULEURS_ESCALIER[e.materiau],
          socle: COULEURS_ELEVATION.enduit,
        };
        return (
          <group key={e.id}>
            {pieces.map((p, i) => (
              <mesh
                key={i}
                position={[M(p.centre.x), M(p.centre.z), M(p.centre.y)]}
                rotation={[0, -p.angle, p.pente, 'YZX']}
                castShadow
                receiveShadow
                material={materiauUni(teinte[p.matiere])}
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
