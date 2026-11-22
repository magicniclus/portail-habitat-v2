'use client';

import { directionSoleil, niveauxTries, niveauSuperieur } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { niveauDe, sceneDe, type EtatEditeur } from '../etat';
import { M, Niveau3D } from './Batiment3D';
import { useReserveTelephone } from '../papier';
import { Cadrage, DecalageBas, useCadreMaison, ZoomCamera } from './Cadrage';
import { Terrain3D } from './Terrain3D';
import { Objets3D } from './Objets3D';
import { Orbite } from './Orbite';
import { Orthophoto3D } from './Orthophoto3D';

/**
 * Vue 3D (DES-33) : orbite, zoom, panoramique ; maison entière ou niveau isolé, maison de
 * poupée, ombres selon l'heure et le nord. On n'y modifie rien : tout se fait en 2D.
 * Chargée à la demande (import dynamique) : three.js n'alourdit pas l'éditeur 2D.
 */
export default function Vue3D({
  etat,
  ortho = null,
}: {
  etat: EtatEditeur;
  /** Photo aérienne de l'implantation (DES-35), en data URL. */
  ortho?: string | null;
}) {
  const scene = sceneDe(etat);
  const courant = niveauDe(etat);
  const niveaux = useMemo(() => {
    const tries = niveauxTries(scene);
    // Vue extérieure : toute la maison, fermée, toit compris.
    if (etat.vueExterieure) return tries;
    return etat.rendu.niveauSeul ? [courant] : tries.filter((n) => n.altitude <= courant.altitude);
  }, [scene, courant, etat.rendu.niveauSeul, etat.vueExterieure]);
  const poupee = etat.rendu.poupee && !etat.vueExterieure;
  // Téléphone, panneau ouvert : la maison se montre au-dessus de la feuille du bas.
  const bas = useReserveTelephone(Boolean(etat.menu || etat.proprietes));

  const { centre, rayon } = useCadreMaison(courant);
  const soleil = directionSoleil(etat.rendu.heure, scene.orientationNord);
  const posSoleil: [number, number, number] = [
    centre.x + soleil.x * rayon * 3,
    centre.y + soleil.z * rayon * 3,
    centre.z + soleil.y * rayon * 3,
  ];

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: 45, near: 0.05, far: 500 }}
      aria-label="Vue 3D du plan"
      data-testid="vue-3d"
      style={{ background: COULEURS_3D.ciel }}
    >
      <hemisphereLight args={[COULEURS_3D.ciel, COULEURS_3D.terrain, 0.9]} />
      <directionalLight
        position={posSoleil}
        intensity={soleil.z > 0.1 ? 2.2 : 0.8}
        color={COULEURS_3D.soleil}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-rayon * 1.5}
        shadow-camera-right={rayon * 1.5}
        shadow-camera-top={rayon * 1.5}
        shadow-camera-bottom={-rayon * 1.5}
        shadow-camera-far={rayon * 8}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        target-position={[centre.x, centre.y, centre.z]}
      />
      <Terrain3D scene={scene} centre={centre} cote={rayon * 12} />
      <Orthophoto3D scene={scene} url={ortho} />
      {niveaux.map((n) => (
        <Niveau3D
          key={n.id}
          n={n}
          dessus={niveauSuperieur(scene, n.id)}
          parcelle={scene.terrain?.parcelle ?? null}
          centre={centre}
          poupee={poupee && n.id === courant.id}
          // « Extérieur · tout fermé » : la maison fermée, murs toujours opaques.
          transparent={etat.rendu.mursTransparents && !etat.vueExterieure}
          plafonds={false}
          // Un niveau affiché avec un étage au-dessus : pas de toit (on regarde ce niveau).
          toit={
            etat.vueExterieure ||
            (etat.rendu.toit && !poupee && !niveauSuperieur(scene, courant.id))
          }
          selection={n.id === courant.id ? etat.selection : undefined}
        />
      ))}
      {niveaux.map((n) => (
        <group key={`o-${n.id}`} position={[0, M(n.altitude), 0]}>
          <Objets3D
            objets={n.objets}
            selectionId={
              n.id === courant.id && etat.selection?.genre === 'objet' ? etat.selection.id : null
            }
          />
        </group>
      ))}
      <Cadrage centre={centre} rayon={rayon} cle={`${courant.id}-${etat.ajustement}`} bas={bas} />
      <DecalageBas bas={bas} />
      <ZoomCamera zoom={etat.zoom} />
      <Orbite rayon={rayon} />
    </Canvas>
  );
}
