'use client';

import { toit3D, type Niveau, type Point3 } from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_COUVERTURE } from '@ph/ui/tokens';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three';
import { aretesHautes, geometrieCouverture } from './couverture3d';
import { materiauCouverture, materiauRevetement, materiauUni } from './textures';
import { M } from './unites';

/**
 * Épaisseur de la couverture (mm) : le toit est posé au-dessus du haut des murs. Sans elle,
 * les deux surfaces se confondent et l'affichage dessine de fins traits blancs (z-fighting).
 */
const EPAISSEUR = 30;
/** Épaisseur visible de la couverture (rive), en mm : chevrons, liteaux et tuiles. */
const RIVE = 160;

/** Polygone plan convexe → triangles en éventail (mètres, y vers le haut), relevé de `dz`. */
function geometrie(polys: readonly Point3[][], dz = 0): BufferGeometry {
  const pos: number[] = [];
  for (const p of polys)
    for (let i = 1; i < p.length - 1; i++)
      for (const q of [p[0]!, p[i]!, p[i + 1]!]) pos.push(M(q.x), M(q.z + dz), M(q.y));
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Pignon tourné vers l'extérieur de la maison : sa face éclairée est la même que celle du mur
 * en dessous (sinon la lumière le rend plus sombre ou plus clair que le mur).
 */
function versLExterieur(poly: Point3[], pans: readonly Point3[][]): Point3[] {
  // Centre du toit de ce bâtiment-là : les pans qui touchent le pignon (un bâtiment séparé
  // ne doit pas se retourner vers la maison voisine).
  const touche = (pan: readonly Point3[]) =>
    pan.some((p) => poly.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 5));
  const voisins = pans.filter(touche);
  const tous = (voisins.length ? voisins : pans).flat();
  const cx = tous.reduce((s, p) => s + p.x, 0) / tous.length;
  const cy = tous.reduce((s, p) => s + p.y, 0) / tous.length;
  // Normale horizontale (Newell) du polygone vertical, comparée à la direction centre → pignon.
  let [nx, ny] = [0, 0];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    nx += (p.y - q.y) * (p.z + q.z);
    ny += (p.z - q.z) * (p.x + q.x);
  });
  const mx = poly.reduce((s, p) => s + p.x, 0) / poly.length - cx;
  const my = poly.reduce((s, p) => s + p.y, 0) / poly.length - cy;
  // Repère 3D (x, z vers le haut, y du plan → z) : l'ordre des sommets s'inverse.
  return nx * mx + ny * my > 0 ? [...poly].reverse() : poly;
}

/**
 * Toiture en 3D (DES-16, DES-17) : couverture texturée en volume (rives, sous-face),
 * faîtières, pignons en façade, gouttières demi-rondes, fenêtres de toit, cheminées, lucarnes.
 */
export function Toit3D({ n, dessus }: { n: Niveau; dessus: Niveau | null }) {
  const t = useMemo(() => toit3D(n, dessus), [n, dessus]);
  const couverture = useMemo(() => (t ? geometrieCouverture(t.pans, EPAISSEUR, RIVE) : null), [t]);
  const faitieres = useMemo(() => (t ? aretesHautes(t.pans) : []), [t]);
  useEffect(
    () => () => {
      couverture?.dessus.dispose();
      couverture?.rives.dispose();
    },
    [couverture],
  );
  const murs = useMemo(
    () => (t ? geometrie(t.murs.map((m) => versLExterieur(m, t.pans))) : null),
    [t],
  );
  const famille = n.toiture?.couverture.famille ?? 'tuile';
  const teinte =
    COULEURS_COUVERTURE[famille as keyof typeof COULEURS_COUVERTURE] ?? COULEURS_COUVERTURE.tuile;
  const materiau = useMemo(() => materiauCouverture(famille, teinte), [famille, teinte]);
  // Pignons du même matériau que la face extérieure des murs : aucune différence de teinte.
  // Plein des deux côtés : vu du dehors comme de l'intérieur (combles, maison de poupée).
  const facade = useMemo(() => {
    const m = materiauRevetement({ famille: 'aucun' }).clone();
    m.side = DoubleSide;
    return m;
  }, []);
  if (!t || !couverture || !murs) return null;
  return (
    <group>
      <mesh geometry={couverture.dessus} material={materiau} castShadow receiveShadow />
      {/* Rives et sous-face : planches de rive claires, épaisseur réelle de la couverture. */}
      <mesh geometry={couverture.rives} material={materiauUni(COULEURS_3D.clair)} castShadow />
      <mesh geometry={murs} material={facade} castShadow receiveShadow />
      {faitieres.map(([a, b], i) => {
        const l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        const auSol = Math.hypot(b.x - a.x, b.y - a.y);
        return (
          <mesh
            key={`f${i}`}
            position={[
              M((a.x + b.x) / 2),
              M((a.z + b.z) / 2 + EPAISSEUR) + 0.02,
              M((a.y + b.y) / 2),
            ]}
            rotation={[
              0,
              -Math.atan2(b.y - a.y, b.x - a.x),
              Math.atan2(b.z - a.z, auSol) + Math.PI / 2,
              'YZX',
            ]}
            material={materiauUni(teinte)}
            castShadow
          >
            {/* Faîtière : rond à moitié noyé le long du faîtage ou de l'arêtier. */}
            <cylinderGeometry args={[0.08, 0.08, M(l), 12]} />
          </mesh>
        );
      })}
      {t.gouttieres.map(([a, b], i) => {
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        return (
          <mesh
            key={`g${i}`}
            position={[M((a.x + b.x) / 2), M((a.z + b.z) / 2 - RIVE) - 0.03, M((a.y + b.y) / 2)]}
            rotation={[0, -Math.atan2(b.y - a.y, b.x - a.x), Math.PI / 2]}
            material={materiauUni(COULEURS_3D.quincaillerie)}
          >
            {/* Gouttière discrète, sous la rive. */}
            <cylinderGeometry args={[0.04, 0.04, M(l), 12]} />
          </mesh>
        );
      })}
      {t.fenetres.map((f, i) => (
        <mesh
          key={`f${i}`}
          position={[M(f.centre.x), M(f.centre.z), M(f.centre.y)]}
          rotation={[f.inclinaison, -f.angle, 0, 'YXZ']}
          material={materiauUni(COULEURS_3D.verre)}
        >
          <boxGeometry args={[M(f.taille.l), M(f.taille.h), M(f.taille.p)]} />
        </mesh>
      ))}
      {[
        ...t.cheminees.map((c) => ({ c, brique: true })),
        ...t.lucarnes.map((c) => ({ c, brique: false })),
      ].map(({ c, brique }, i) => (
        <mesh
          key={`c${i}`}
          position={[M(c.centre.x), M(c.centre.z), M(c.centre.y)]}
          rotation={[0, -c.angle, 0]}
          material={materiauUni(brique ? COULEURS_COUVERTURE.brique : COULEURS_COUVERTURE.facade)}
          castShadow
        >
          <boxGeometry args={[M(c.taille.l), M(c.taille.h), M(c.taille.p)]} />
        </mesh>
      ))}
    </group>
  );
}
