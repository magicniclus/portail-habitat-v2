'use client';

import { useMediaQuery } from '@/lib/useMediaQuery';
import { directionSoleil, niveauxTries, niveauSuperieur } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { niveauDe, sceneDe, type EtatEditeur } from '../etat';
import { M, Niveau3D } from './Batiment3D';
import { Cadrage, useCadreMaison, ZoomCamera } from './Cadrage';
import { Objets3D } from './Objets3D';
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
  const mouvementReduit = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const courant = niveauDe(etat);
  const niveaux = useMemo(() => {
    const tries = niveauxTries(scene);
    // Vue extérieure : toute la maison, fermée, toit compris.
    if (etat.vueExterieure) return tries;
    return etat.rendu.niveauSeul ? [courant] : tries.filter((n) => n.altitude <= courant.altitude);
  }, [scene, courant, etat.rendu.niveauSeul, etat.vueExterieure]);
  const poupee = etat.rendu.poupee && !etat.vueExterieure;

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
      {/* Terrain. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centre.x, -0.01, centre.z]} receiveShadow>
        <planeGeometry args={[rayon * 12, rayon * 12]} />
        <meshStandardMaterial color={COULEURS_3D.terrain} roughness={1} />
      </mesh>
      <Orthophoto3D scene={scene} url={ortho} />
      {niveaux.map((n) => (
        <Niveau3D
          key={n.id}
          n={n}
          dessus={niveauSuperieur(scene, n.id)}
          parcelle={scene.terrain?.parcelle ?? null}
          centre={centre}
          poupee={poupee && n.id === courant.id}
          transparent={etat.rendu.mursTransparents}
          plafonds={false}
          toit={etat.vueExterieure || (etat.rendu.toit && !poupee)}
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
      <Cadrage centre={centre} rayon={rayon} cle={`${courant.id}-${etat.ajustement}`} />
      <ZoomCamera zoom={etat.zoom} />
      <OrbitControls
        makeDefault
        // Réduire les animations (DES-47) : pas d'inertie de la caméra.
        enableDamping={!mouvementReduit}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={rayon * 6}
      />
    </Canvas>
  );
}
