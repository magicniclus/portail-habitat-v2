'use client';

import { ligneDeFace, longueurMur, type Niveau } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, MeshBasicMaterial } from 'three';
import type { Selection3D } from './selection3d';
import { M } from './unites';

/** Voile de sélection : discret, la matière du mur reste lisible dessous. */
const voile = new MeshBasicMaterial({
  color: COULEURS_PLAN.murSelection,
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
  side: DoubleSide,
});

/**
 * Face ou pan de mur sélectionné en 3D (DES-25) : un voile léger et un contour net sur la face
 * choisie, ou sur la seule partie comprise entre deux cloisons, comme en CAO.
 */
export function SurlignagePan({ n, selection: s }: { n: Niveau; selection?: Selection3D }) {
  const mur = s?.genre === 'mur' ? n.murs.find((m) => m.id === s.id) : undefined;
  const face = s?.face;
  const position = s?.s;
  const geometrie = useMemo(() => {
    if (!mur || !face) return null;
    // Le pan cliqué, ou toute la face quand on a choisi un côté.
    const ligne = ligneDeFace(n, mur.id, face, position);
    if (!ligne) return null;
    const l = longueurMur(mur);
    const cote = face === 'a' ? 1 : -1;
    // Décalage hors de la face (+ 3 mm) : le voile ne se confond pas avec le mur.
    const [dx, dy] = [(-(mur.b.y - mur.a.y) / l) * 3 * cote, ((mur.b.x - mur.a.x) / l) * 3 * cote];
    const [p0, p1] = ligne.map((q) => ({ x: q.x + dx, y: q.y + dy })) as [
      { x: number; y: number },
      { x: number; y: number },
    ];
    const [z0, z1] = [n.altitude, n.altitude + Math.max(mur.hauteur, mur.hauteurB ?? 0)];
    const v = (q: { x: number; y: number }, z: number) => [M(q.x), M(z), M(q.y)];
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [...v(p0, z0), ...v(p1, z0), ...v(p1, z1), ...v(p0, z0), ...v(p1, z1), ...v(p0, z1)],
        3,
      ),
    );
    return g;
  }, [n, mur, face, position]);
  useEffect(() => () => geometrie?.dispose(), [geometrie]);
  if (!geometrie) return null;
  return (
    <mesh geometry={geometrie} material={voile} renderOrder={2} raycast={() => null}>
      <Edges color={COULEURS_PLAN.murSelection} lineWidth={2} threshold={1} />
    </mesh>
  );
}
