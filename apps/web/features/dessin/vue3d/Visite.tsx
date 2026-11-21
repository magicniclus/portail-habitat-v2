'use client';

import { departVisite, directionSoleil, niveauALaHauteur, niveauSuperieur } from '@ph/core/dessin';
import { COULEURS_3D } from '@ph/ui/tokens';
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { niveauDe, sceneDe, type EtatEditeur } from '../etat';
import { M, Niveau3D } from './Batiment3D';
import { Joystick } from './Joystick';
import { Marcheur, REGARD, TOUCHES, type Commandes, type Visiteur } from './Marcheur';
import { MiniPlan } from './MiniPlan';
import { Objets3D } from './Objets3D';

/**
 * Visite (DES-34) : première personne à 1,60 m, à travers les murs, escaliers ; clavier
 * (ZQSD, flèches), glisser pour regarder, joystick tactile, mini-plan. Chargée à la demande.
 */
export default function Visite({ etat }: { etat: EtatEditeur }) {
  const scene = sceneDe(etat);
  const courant = niveauDe(etat);
  const commandes = useRef<Commandes>({
    touches: new Set(),
    joystick: { x: 0, y: 0 },
    lacet: -Math.PI / 2,
    tangage: 0,
  });
  const [depart] = useState<Visiteur>(() => ({
    position: departVisite(courant),
    z: courant.altitude,
  }));
  const dernier = useRef<Visiteur>(depart);
  const [suivi, setSuivi] = useState({ ...depart, lacet: -Math.PI / 2 });

  useEffect(() => {
    const touches = commandes.current.touches;
    const bas = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (!TOUCHES[k] || (ev.target as HTMLElement).closest('input, select, textarea')) return;
      ev.preventDefault();
      ev.stopPropagation();
      touches.add(k);
    };
    const haut = (ev: KeyboardEvent) => touches.delete(ev.key.toLowerCase());
    // Capture : les flèches ne déplacent pas la sélection du plan pendant la visite.
    window.addEventListener('keydown', bas, true);
    window.addEventListener('keyup', haut);
    const minuterie = setInterval(
      () => setSuivi({ ...dernier.current, lacet: commandes.current.lacet }),
      150,
    );
    return () => {
      window.removeEventListener('keydown', bas, true);
      window.removeEventListener('keyup', haut);
      clearInterval(minuterie);
    };
  }, []);

  const soleil = directionSoleil(etat.rendu.heure, scene.orientationNord);
  const regard = useRef<{ x: number; y: number } | null>(null);
  const n = niveauALaHauteur(scene, suivi.z);
  return (
    <div
      className="relative h-full w-full touch-none select-none"
      data-testid="visite"
      tabIndex={0}
      aria-label="Visite : ZQSD ou flèches pour marcher, glisser pour regarder"
      onPointerDown={(ev) => {
        ev.currentTarget.setPointerCapture(ev.pointerId);
        ev.currentTarget.focus();
        regard.current = { x: ev.clientX, y: ev.clientY };
      }}
      onPointerMove={(ev) => {
        const r = regard.current;
        if (!r) return;
        const c = commandes.current;
        c.lacet += (ev.clientX - r.x) * REGARD;
        c.tangage = Math.max(-1.2, Math.min(1.2, c.tangage - (ev.clientY - r.y) * REGARD));
        regard.current = { x: ev.clientX, y: ev.clientY };
      }}
      onPointerUp={() => (regard.current = null)}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.05, far: 300 }}
        style={{ background: COULEURS_3D.ciel }}
      >
        <hemisphereLight args={[COULEURS_3D.ciel, COULEURS_3D.terrain, 1.8]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[soleil.x * 50, soleil.z * 50, soleil.y * 50]}
          intensity={1.6}
          color={COULEURS_3D.soleil}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color={COULEURS_3D.terrain} />
        </mesh>
        {scene.niveaux.map((niv) => (
          <group key={niv.id}>
            <Niveau3D
              n={niv}
              dessus={niveauSuperieur(scene, niv.id)}
              parcelle={scene.terrain?.parcelle ?? null}
              centre={new Vector3()}
              poupee={false}
              plafonds
              portesOuvertes
              toit
            />
            <group position={[0, M(niv.altitude), 0]}>
              <Objets3D objets={niv.objets} selectionId={null} />
            </group>
          </group>
        ))}
        <Marcheur
          scene={scene}
          commandes={commandes}
          depart={depart}
          signaler={(v) => (dernier.current = v)}
        />
      </Canvas>
      <MiniPlan n={n} position={suivi.position} lacet={suivi.lacet} />
      <Joystick bouger={(v) => (commandes.current.joystick = v)} />
    </div>
  );
}
