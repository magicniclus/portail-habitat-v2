'use client';

import { longueurMur, panDeMur, type Niveau } from '@ph/core/dessin';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import { Edges } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, MeshBasicMaterial } from 'three';
import type { Clic3D } from './clic3d';
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
 * Pan de mur sélectionné en 3D (DES-25) : un voile léger et un contour net sur la seule partie
 * de la face comprise entre deux cloisons, comme une sélection de logiciel de CAO.
 */
export function SurlignagePan({ n, clic }: { n: Niveau; clic: Clic3D | undefined }) {
  const s = clic?.selection;
  const mur = s?.genre === 'mur' ? n.murs.find((m) => m.id === s.id) : undefined;
  const face = s?.face;
  const position = s?.s;
  const geometrie = useMemo(() => {
    if (!mur || !face || position === undefined) return null;
    const pan = panDeMur(n, mur.id, face, position);
    if (!pan) return null;
    const l = longueurMur(mur);
    const u = { x: (mur.b.x - mur.a.x) / l, y: (mur.b.y - mur.a.y) / l };
    const cote = face === 'a' ? 1 : -1;
    // Décalage hors de la face (+ 3 mm) : le voile ne se confond pas avec le mur.
    const d = (mur.epaisseur / 2 + 3) * cote;
    const p = (t: number) => ({ x: mur.a.x + u.x * t - u.y * d, y: mur.a.y + u.y * t + u.x * d });
    const [p0, p1] = [p(pan.visible[0]), p(pan.visible[1])];
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
