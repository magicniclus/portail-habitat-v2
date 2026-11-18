'use client';

import { centroide, marchesTerrasse, type Point, type Terrasse } from '@ph/core/dessin';
import { COULEURS_3D, COULEURS_EXTERIEUR as C, COULEURS_TERRASSE } from '@ph/ui/tokens';
import { useMemo, type ReactNode } from 'react';
import { ExtrudeGeometry } from 'three';
import { cotes, forme, Poteau, Segment } from './FormesExterieur3D';
import { materiauRevetement } from './textures';
import { M } from './unites';

/** Terrasse (DES-18) : plateau à sa hauteur, marches, garde-corps, pergola. */
export function Terrasse3D({
  t,
  maison,
  contreMaison,
}: {
  t: Terrasse;
  maison: Point | undefined;
  /** Côtés collés à la façade (pas de garde-corps). */
  contreMaison: boolean[];
}) {
  const h = Math.max(t.hauteur, 40);
  const g = useMemo(
    () => new ExtrudeGeometry(forme(t.contour), { depth: M(h), bevelEnabled: false }),
    [t.contour, h],
  );
  const marches = marchesTerrasse(t, maison);
  const c = centroide(t.contour);
  const pieces: ReactNode[] = [];
  if (marches) {
    // Direction vers l'extérieur de la terrasse, perpendiculaire à son premier côté.
    let [nx, ny] = [-Math.sin(marches.angle), Math.cos(marches.angle)];
    if ((c.x - marches.centre.x) * nx + (c.y - marches.centre.y) * ny > 0) [nx, ny] = [-nx, -ny];
    for (let i = 0; i < marches.nombre; i++) {
      const d = (i + 0.5) * marches.giron;
      const centre = { x: marches.centre.x + nx * d, y: marches.centre.y + ny * d };
      const u = { x: Math.cos(marches.angle), y: Math.sin(marches.angle) };
      const hm = (marches.nombre - i) * marches.hauteur;
      pieces.push(
        <Segment
          key={`m${i}`}
          a={{
            x: centre.x - (u.x * marches.largeur) / 2,
            y: centre.y - (u.y * marches.largeur) / 2,
          }}
          b={{
            x: centre.x + (u.x * marches.largeur) / 2,
            y: centre.y + (u.y * marches.largeur) / 2,
          }}
          e={marches.giron}
          h={hm}
          couleur={C.margelle}
        />,
      );
    }
  }
  if (t.gardeCorps)
    // Garde-corps (1 m) sur les côtés libres : poteaux tous les 1,50 m au plus, main courante,
    // remplissage en verre clair ; rien contre la maison, ouvert au droit des marches.
    cotes(t.contour).forEach(([a, b], i) => {
      if ((marches && i === marches.cote) || contreMaison[i]) return;
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1_500));
      for (let k = 0; k <= n; k++) {
        const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
        pieces.push(
          <Poteau
            key={`p${i}-${k}`}
            p={p}
            c={60}
            h={1_000}
            z0={h}
            couleur={COULEURS_3D.quincaillerie}
          />,
        );
      }
      pieces.push(
        <Segment
          key={`g${i}`}
          a={a}
          b={b}
          e={60}
          h={50}
          z0={h + 1_000}
          couleur={COULEURS_3D.quincaillerie}
        />,
      );
      pieces.push(
        <Segment
          key={`v${i}`}
          a={a}
          b={b}
          e={10}
          h={850}
          z0={h + 100}
          couleur={COULEURS_3D.verre}
          transparent
        />,
      );
    });
  if (t.pergola) {
    for (const [i, p] of t.contour.entries())
      pieces.push(<Poteau key={`po${i}`} p={p} c={120} h={2_500} z0={h} couleur={C.tronc} />);
    cotes(t.contour).forEach(([a, b], i) =>
      pieces.push(
        <Segment key={`pb${i}`} a={a} b={b} e={80} h={150} z0={h + 2_500} couleur={C.tronc} />,
      ),
    );
  }
  return (
    <group>
      <mesh
        geometry={g}
        material={materiauRevetement(
          t.revetement,
          COULEURS_TERRASSE[t.revetement.famille] ?? C.margelle,
        )}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, M(h), 0]}
        castShadow
        receiveShadow
      />
      {pieces}
    </group>
  );
}
