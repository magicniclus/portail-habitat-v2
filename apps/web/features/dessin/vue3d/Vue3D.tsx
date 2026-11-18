'use client';

import { directionSoleil, niveauxTries, type Objet, type Point } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState, type Dispatch } from 'react';
import { Vector3 } from 'three';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from '../etat';
import { M, Niveau3D } from './Batiment3D';
import { Cadrage } from './Cadrage';
import { Objets3D } from './Objets3D';

/**
 * Vue 3D (DES-33) : orbite, zoom, panoramique ; maison entière ou niveau isolé, maison de
 * poupée, ombres selon l'heure et le nord. Meubles : clic, glisser, rotation libre.
 * Chargée à la demande (import dynamique) : three.js n'alourdit pas l'éditeur 2D.
 */
export default function Vue3D({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  const scene = sceneDe(etat);
  const courant = niveauDe(etat);
  const niveaux = useMemo(() => {
    const tries = niveauxTries(scene);
    return etat.rendu.niveauSeul ? [courant] : tries.filter((n) => n.altitude <= courant.altitude);
  }, [scene, courant, etat.rendu.niveauSeul]);

  // Boîte englobante du niveau courant : centre de la maison et cadrage de la caméra.
  const { centre, rayon } = useMemo(() => {
    const pts = courant.murs.flatMap((m) => [m.a, m.b]);
    if (!pts.length) return { centre: new Vector3(0, 0, 0), rayon: 8 };
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    return {
      centre: new Vector3(M((x0 + x1) / 2), M(courant.altitude), M((y0 + y1) / 2)),
      rayon: Math.max(4, M(Math.hypot(x1 - x0, y1 - y0)) / 2),
    };
  }, [courant]);
  const soleil = directionSoleil(etat.rendu.heure, scene.orientationNord);
  const posSoleil: [number, number, number] = [
    centre.x + soleil.x * rayon * 3,
    centre.y + soleil.z * rayon * 3,
    centre.z + soleil.y * rayon * 3,
  ];

  // Glisser un meuble sur le sol du niveau courant (placement automatique, Alt : libre).
  const glisse = useRef<{ id: string; decalage: Point; geste: string } | null>(null);
  const [orbite, setOrbite] = useState(true);
  const finir = () => {
    if (!glisse.current) return;
    glisse.current = null;
    setOrbite(true);
    dispatch({ type: 'finGeste' });
  };

  const glisser = (o: Objet, ev: ThreeEvent<PointerEvent>) => {
    if (o.id !== etat.selection?.id) return;
    const p = ev.point;
    glisse.current = {
      id: o.id,
      decalage: { x: o.position.x - p.x * 1000, y: o.position.y - p.z * 1000 },
      geste: `glisser3d-${o.id}-${Date.now()}`,
    };
    setOrbite(false);
    window.addEventListener('pointerup', finir, { once: true });
  };
  const deplacer = (ev: ThreeEvent<PointerEvent>) => {
    const g = glisse.current;
    if (!g) return;
    dispatch({
      type: 'deplacerObjetVers',
      id: g.id,
      vers: {
        x: Math.round(ev.point.x * 1000 + g.decalage.x),
        y: Math.round(ev.point.z * 1000 + g.decalage.y),
      },
      geste: g.geste,
      libre: ev.nativeEvent.altKey,
    });
  };
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: 45, near: 0.05, far: 500 }}
      onPointerMissed={() => dispatch({ type: 'selectionner', selection: null })}
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
        target-position={[centre.x, centre.y, centre.z]}
      />
      {/* Terrain et plan de glisser des meubles, à l'altitude du niveau courant. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centre.x, -0.01, centre.z]} receiveShadow>
        <planeGeometry args={[rayon * 12, rayon * 12]} />
        <meshStandardMaterial color={COULEURS_3D.terrain} roughness={1} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centre.x, centre.y, centre.z]}
        onPointerMove={deplacer}
      >
        <planeGeometry args={[rayon * 12, rayon * 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {niveaux.map((n) => (
        <Niveau3D
          key={n.id}
          n={n}
          centre={centre}
          poupee={etat.rendu.poupee && n.id === courant.id}
          plafonds={false}
        />
      ))}
      {niveaux.map((n) => (
        <group key={`o-${n.id}`} position={[0, M(n.altitude), 0]}>
          <Objets3D
            objets={n.objets}
            selectionId={
              n.id === courant.id && etat.selection?.genre === 'objet' ? etat.selection.id : null
            }
            dispatch={dispatch}
            glisser={glisser}
          />
        </group>
      ))}
      <Cadrage centre={centre} rayon={rayon} cle={`${courant.id}-${etat.ajustement}`} />
      <OrbitControls
        makeDefault
        enabled={orbite}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={rayon * 6}
      />
    </Canvas>
  );
}
