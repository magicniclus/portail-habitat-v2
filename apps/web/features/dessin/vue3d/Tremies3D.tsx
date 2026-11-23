'use client';

import { emprise, type Niveau } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { cotes, Segment } from './FormesExterieur3D';

/**
 * Habillage des trémies (DES-15) : joues verticales autour de l'ouverture, du plafond du niveau
 * jusqu'au plancher de l'étage. Par la trémie, on ne voit plus le vide du plancher.
 */
export function HabillageTremies({ n, dessus }: { n: Niveau; dessus: Niveau }) {
  const bas = n.altitude + n.hauteurSousPlafond;
  return n.escaliers.flatMap((e) =>
    cotes(emprise(e)).map(([a, b], i) => (
      <Segment
        key={`${e.id}-${i}`}
        a={a}
        b={b}
        e={30}
        h={dessus.altitude - bas + 6}
        z0={bas - 3}
        couleur={COULEURS_3D.mur}
      />
    )),
  );
}
