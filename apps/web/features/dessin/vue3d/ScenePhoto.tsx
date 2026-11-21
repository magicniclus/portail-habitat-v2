'use client';

import { useMediaQuery } from '@/lib/useMediaQuery';
import { directionSoleil, niveauxTries, niveauSuperieur } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { useEffect } from 'react';
import { niveauDe, sceneDe, type EtatEditeur } from '../etat';
import { M, Niveau3D } from './Batiment3D';
import { Cadrage, useCadreMaison } from './Cadrage';
import { Objets3D } from './Objets3D';

export type Capturer = (largeurPx: number, type: string) => Promise<Blob | null>;

const deuxImages = () =>
  new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));

/**
 * Capture HD (D85 : tout dans le navigateur) : on monte la densité de pixels le temps d'une
 * image pour atteindre la largeur voulue, on lit le canevas, puis on revient à l'écran.
 */
function Capture({ exposer }: { exposer: (c: Capturer) => void }) {
  const lire = useThree((s) => s.get);
  useEffect(() => {
    exposer(async (largeurPx, type) => {
      const { gl, setDpr, size, viewport } = lire();
      const avant = viewport.dpr;
      setDpr(Math.min(4, largeurPx / Math.max(1, size.width)));
      await deuxImages();
      const blob = await new Promise<Blob | null>((ok) => gl.domElement.toBlob(ok, type, 0.9));
      setDpr(avant);
      return blob;
    });
  }, [exposer, lire]);
  return null;
}

/** Scène de la vue photo (DES-37) : ambiance jour ou soirée, occlusion ambiante, vignette. */
export function ScenePhoto({
  etat,
  exposer,
}: {
  etat: EtatEditeur;
  exposer: (c: Capturer) => void;
}) {
  const scene = sceneDe(etat);
  const mouvementReduit = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const courant = niveauDe(etat);
  const { centre, rayon } = useCadreMaison(courant);
  const soiree = etat.rendu.ambiance === 'soiree';
  const soleil = directionSoleil(soiree ? 19 : etat.rendu.heure, scene.orientationNord);
  const niveaux = etat.rendu.niveauSeul
    ? [courant]
    : niveauxTries(scene).filter((n) => n.altitude <= courant.altitude);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: 40, near: 0.05, far: 500 }}
      style={{ background: soiree ? COULEURS_3D.soiree : COULEURS_3D.ciel }}
    >
      <hemisphereLight
        args={[
          soiree ? COULEURS_3D.soiree : COULEURS_3D.ciel,
          COULEURS_3D.terrain,
          soiree ? 0.8 : 0.9,
        ]}
      />
      <directionalLight
        position={[
          centre.x + soleil.x * rayon * 3,
          centre.y + soleil.z * rayon * 3,
          centre.z + soleil.y * rayon * 3,
        ]}
        intensity={soiree ? 1.1 : 2.2}
        color={soiree ? COULEURS_3D.couchant : COULEURS_3D.soleil}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-rayon * 1.5}
        shadow-camera-right={rayon * 1.5}
        shadow-camera-top={rayon * 1.5}
        shadow-camera-bottom={-rayon * 1.5}
        shadow-camera-far={rayon * 8}
        shadow-bias={-0.0005}
        target-position={[centre.x, centre.y, centre.z]}
      />
      {soiree ? (
        <pointLight
          position={[centre.x, centre.y + 2.2, centre.z]}
          intensity={6}
          color={COULEURS_3D.lampe}
          distance={rayon * 2}
        />
      ) : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centre.x, -0.01, centre.z]} receiveShadow>
        <planeGeometry args={[rayon * 12, rayon * 12]} />
        <meshStandardMaterial color={COULEURS_3D.terrain} roughness={1} />
      </mesh>
      {niveaux.map((n) => (
        <group key={n.id}>
          <Niveau3D
            n={n}
            dessus={niveauSuperieur(scene, n.id)}
            parcelle={scene.terrain?.parcelle ?? null}
            centre={centre}
            poupee={etat.rendu.poupee && n.id === courant.id}
            plafonds={false}
            toit={etat.rendu.toit && !etat.rendu.poupee}
          />
          <group position={[0, M(n.altitude), 0]}>
            <Objets3D objets={n.objets} selectionId={null} />
          </group>
        </group>
      ))}
      <Cadrage
        centre={centre}
        rayon={rayon}
        cle={`${courant.id}-${etat.ajustement}-${etat.rendu.cadrage}`}
      />
      <OrbitControls
        makeDefault
        // Réduire les animations (DES-47) : pas d'inertie de la caméra.
        enableDamping={!mouvementReduit}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={rayon * 6}
      />
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={0.6} intensity={2.5} />
        <Vignette offset={0.3} darkness={0.35} />
        <ToneMapping />
      </EffectComposer>
      <Capture exposer={exposer} />
    </Canvas>
  );
}
