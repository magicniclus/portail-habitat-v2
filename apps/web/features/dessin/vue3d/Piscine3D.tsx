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
 * Piscine en 3D (DES-20) : margelles d'un seul tenant (angles nets), liner clair au bord, eau
 * opaque juste au-dessus du plancher (on ne voit ni la terrasse ni le gazon dessous).
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
  // Eau juste au-dessus du plancher (terrasse ou gazon), sous les margelles : toujours visible.
  const eau = horsSol ? sol + p.profondeurMin - 50 : sol + 8;
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
