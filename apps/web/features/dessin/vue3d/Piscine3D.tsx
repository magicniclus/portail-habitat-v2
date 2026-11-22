'use client';

import { contourMargelles, contourPiscine, type Piscine } from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_EXTERIEUR as C } from '@ph/ui/tokens';
import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry } from 'three';
import { cotes, Dalle, forme, Segment } from './FormesExterieur3D';
import { materiauRevetement } from './textures';
import { M } from './unites';

/** Hauteur des margelles au-dessus du sol ou de la terrasse (mm). */
const MARGELLE = 50;

/**
 * Piscine en 3D (DES-20) : margelles d'un seul tenant (angles nets), bassin découpé dans la
 * terrasse, liner clair au bord, eau opaque (on ne voit plus la terrasse ou le gazon dessous).
 * Hors-sol : parois en bois autour du bassin.
 */
export function Piscine3D({ p, sol }: { p: Piscine; sol: number }) {
  const bassin = useMemo(() => contourPiscine(p), [p]);
  const horsSol = p.forme === 'hors_sol';
  const margelles = useMemo(() => {
    if (horsSol) return null;
    const s = forme(contourMargelles(p));
    s.holes.push(forme(bassin));
    return new ExtrudeGeometry(s, { depth: M(MARGELLE), bevelEnabled: false });
  }, [p, bassin, horsSol]);
  useEffect(() => () => margelles?.dispose(), [margelles]);
  // Eau sous le bord : visible dans le trou de la terrasse ; au ras du gazon sinon.
  const eau = horsSol ? sol + p.profondeurMin - 50 : Math.max(5, sol - 100);
  return (
    <group>
      <Dalle pts={bassin} z={eau} couleur={C.eau} />
      {horsSol
        ? cotes(bassin).map(([a, b], i) => (
            <Segment key={i} a={a} b={b} e={80} h={p.profondeurMin} z0={sol} couleur={C.tronc} />
          ))
        : cotes(bassin).map(([a, b], i) => (
            // Liner : bande claire du bord de l'eau jusqu'aux margelles.
            <Segment
              key={i}
              a={a}
              b={b}
              e={20}
              h={sol + MARGELLE - eau}
              z0={eau}
              couleur={COULEURS_3D.verre}
            />
          ))}
      {margelles ? (
        <mesh
          geometry={margelles}
          material={materiauRevetement(p.margelle, C.margelle)}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, M(sol + MARGELLE), 0]}
          castShadow
          receiveShadow
        />
      ) : null}
    </group>
  );
}

/** Contours de bassin à découper dans une terrasse (piscines posées dessus). */
export const trousDePiscines = (piscines: readonly Piscine[]) =>
  piscines.filter((p) => p.forme !== 'hors_sol').map((p) => contourPiscine(p));
