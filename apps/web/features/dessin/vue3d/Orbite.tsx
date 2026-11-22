'use client';

import { useMediaQuery } from '@/lib/useMediaQuery';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { MOUSE } from 'three';

/** Saisie en cours dans un champ : la barre d'espace y écrit, elle ne pilote pas la caméra. */
const dansUnChamp = (cible: EventTarget | null) =>
  cible instanceof HTMLElement &&
  Boolean(cible.closest('input, textarea, select, [contenteditable="true"]'));

/**
 * Caméra des vues 3D et photo (DES-33) : glisser déplace la vue, Espace + glisser la fait
 * tourner, molette pour zoomer ; clic droit tourne aussi. Doigts : un pour tourner, deux pour
 * zoomer et déplacer.
 */
export function Orbite({ rayon }: { rayon: number }) {
  const mouvementReduit = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const [tourner, setTourner] = useState(false);
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
