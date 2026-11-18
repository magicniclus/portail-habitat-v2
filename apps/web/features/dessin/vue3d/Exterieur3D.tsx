'use client';

import {
  centroide,
  contourPiscine,
  pointDansPolygone,
  type Niveau,
  type Point,
} from '@ph/core/dessin';
import { COULEURS_EXTERIEUR as C } from '@ph/ui/tokens';
import { cotes, Dalle, Segment } from './FormesExterieur3D';
import { Terrasse3D } from './Terrasse3D';
import { materiauUni } from './textures';
import { M } from './unites';

/** Extérieur en 3D (DES-18 à DES-20) au niveau du sol du niveau. */
export function Exterieur3D({ n, parcelle }: { n: Niveau; parcelle: Point[] | null }) {
  const e = n.exterieur;
  // Centre de la maison : les marches d'une terrasse partent du côté opposé.
  const coins = n.murs.flatMap((m) => [m.a, m.b]);
  const maison = coins.length ? centroide(coins) : undefined;
  return (
    <group position={[0, M(n.altitude), 0]}>
      {parcelle
        ? cotes(parcelle).map(([a, b], i) => (
            <Segment key={`pa${i}`} a={a} b={b} e={60} h={30} couleur={C.parcelle} />
          ))
        : null}
      {e.allees.map((a, i) => (
        <Dalle key={`al${i}`} pts={a} z={8} couleur={C.allee} />
      ))}
      {e.terrasses.map((t) => (
        <Terrasse3D key={t.id} t={t} maison={maison} />
      ))}
      {e.piscines.map((p) => {
        const contour = contourPiscine(p);
        const horsSol = p.forme === 'hors_sol';
        // Piscine encastrée dans une terrasse : eau et margelles au niveau du plancher.
        const terrasse = e.terrasses.find((t) => pointDansPolygone(p.position, t.contour));
        const sol = terrasse ? Math.max(terrasse.hauteur, 40) : 0;
        const eau = sol + (horsSol ? p.profondeurMin - 50 : 10);
        return (
          <group key={p.id}>
            <Dalle pts={contour} z={eau} couleur={C.eau} opacite={0.85} />
            {cotes(contour).map(([a, b], i) => (
              <Segment
                key={i}
                a={a}
                b={b}
                e={horsSol ? 80 : 300}
                h={horsSol ? p.profondeurMin : 50}
                z0={sol}
                couleur={horsSol ? C.tronc : C.margelle}
              />
            ))}
          </group>
        );
      })}
      {e.vegetation.map((v) => {
        const r = v.diametre / 2;
        const [x, z] = [M(v.position.x), M(v.position.y)];
        if (v.type === 'arbre')
          return (
            <group key={v.id} position={[x, 0, z]}>
              <mesh position={[0, 1.25, 0]} material={materiauUni(C.tronc)} castShadow>
                <cylinderGeometry args={[0.12, 0.18, 2.5, 10]} />
              </mesh>
              <mesh
                position={[0, 2.5 + M(r) * 0.7, 0]}
                scale={[1, 0.8, 1]}
                material={materiauUni(C.vegetalFonce)}
                castShadow
              >
                <sphereGeometry args={[M(r), 16, 12]} />
              </mesh>
            </group>
          );
        return (
          <mesh
            key={v.id}
            position={[x, v.type === 'haie' ? 0.8 : M(r), z]}
            material={materiauUni(C.vegetal)}
            castShadow
          >
            {v.type === 'haie' ? (
              <boxGeometry args={[M(v.diametre), 1.6, M(v.diametre)]} />
            ) : (
              <sphereGeometry args={[M(r), 14, 10]} />
            )}
          </mesh>
        );
      })}
      {e.clotures.flatMap((c) =>
        c.points
          .slice(1)
          .map((b, i) => (
            <Segment
              key={`${c.id}-${i}`}
              a={c.points[i]!}
              b={b}
              e={
                c.type === 'muret' ? 200 : c.type === 'haie' ? 600 : c.type === 'grillage' ? 20 : 50
              }
              h={c.hauteur}
              couleur={
                c.type === 'haie'
                  ? C.vegetalFonce
                  : c.type === 'grillage'
                    ? C.grillage
                    : c.type === 'muret'
                      ? C.margelle
                      : C.cloture
              }
            />
          )),
      )}
    </group>
  );
}
