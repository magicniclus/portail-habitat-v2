'use client';

import { useMediaQuery } from '@/lib/useMediaQuery';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { MOUSE } from 'three';

type Controles = ComponentRef<typeof OrbitControls>;

/** Saisie en cours dans un champ : la barre d'espace y écrit, elle ne pilote pas la caméra. */
const dansUnChamp = (cible: EventTarget | null) =>
  cible instanceof HTMLElement &&
  Boolean(cible.closest('input, textarea, select, [contenteditable="true"]'));

/** Pas des touches : rotation (radians) et zoom (facteur). */
const PAS_ROTATION = 0.08;
const PAS_ZOOM = 1.15;

/**
 * Clavier de la vue 3D (DES-47) : flèches pour déplacer la vue, Maj + flèches pour tourner,
 * + et − pour zoomer. Rien pendant une saisie dans un champ.
 */
function useClavier3D(controles: React.RefObject<Controles | null>) {
  useEffect(() => {
    // Relais : les flèches simples passent au déplacement natif des contrôles.
    const relais = new EventTarget();
    let branche = false;
    const bas = (ev: KeyboardEvent) => {
      const c = controles.current;
      if (!c || dansUnChamp(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (!branche) {
        c.listenToKeyEvents(relais as unknown as HTMLElement);
        branche = true;
      }
      const fleche = ev.code.startsWith('Arrow');
      if (fleche && ev.shiftKey) {
        const sens = ev.code === 'ArrowLeft' || ev.code === 'ArrowUp' ? -1 : 1;
        if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight')
          c.setAzimuthalAngle(c.getAzimuthalAngle() + sens * PAS_ROTATION);
        else c.setPolarAngle(c.getPolarAngle() + sens * PAS_ROTATION);
      } else if (fleche) relais.dispatchEvent(new KeyboardEvent('keydown', { code: ev.code }));
      else if (ev.key === '+' || ev.key === '=') c.dollyIn(PAS_ZOOM);
      else if (ev.key === '-') c.dollyOut(PAS_ZOOM);
      else return;
      ev.preventDefault();
      c.update();
    };
    window.addEventListener('keydown', bas);
    return () => window.removeEventListener('keydown', bas);
  }, [controles]);
}

/**
 * Caméra des vues 3D et photo (DES-33) : glisser déplace la vue, Espace + glisser la fait
 * tourner, molette pour zoomer ; clic droit tourne aussi. Doigts : un pour tourner, deux pour
 * zoomer et déplacer. Clavier : voir `useClavier3D`.
 */
export function Orbite({ rayon }: { rayon: number }) {
  const mouvementReduit = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const [tourner, setTourner] = useState(false);
  const controles = useRef<Controles>(null);
  useClavier3D(controles);
  useEffect(() => {
    const bas = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' || dansUnChamp(ev.target)) return;
      ev.preventDefault();
      setTourner(true);
    };
    const haut = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') setTourner(false);
    };
    const quitter = () => setTourner(false);
    window.addEventListener('keydown', bas);
    window.addEventListener('keyup', haut);
    window.addEventListener('blur', quitter);
    return () => {
      window.removeEventListener('keydown', bas);
      window.removeEventListener('keyup', haut);
      window.removeEventListener('blur', quitter);
    };
  }, []);
  return (
    <OrbitControls
      ref={controles}
      makeDefault
      // Réduire les animations (DES-47) : pas d'inertie de la caméra.
      enableDamping={!mouvementReduit}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={1}
      maxDistance={rayon * 6}
      // Le déplacement glisse au ras du sol, comme une carte.
      screenSpacePanning={false}
      mouseButtons={{
        LEFT: tourner ? MOUSE.ROTATE : MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.ROTATE,
      }}
    />
  );
}
