'use client';

import { useRef, type PointerEvent as EvtPointeur } from 'react';

/**
 * Geste de glisser dans la frise : part d'une copie du montage (plan ou frise), convertit le déplacement en ms et
 * applique `appliquer(dx, départ, dy en px)` à chaque mouvement. `onDebut` est appelé au premier
 * mouvement réel (au-delà de 3 px) pour mémoriser l'état d'avant (« Annuler »).
 */
export function useGlisser<T>(px: number, plan: T, onDebut: () => void, onChange: (p: T) => void) {
  const geste = useRef<{ x: number; y: number; depart: T; bouge: boolean } | null>(null);
  return (appliquer: (dx: number, depart: T, dyPx: number) => T, avant?: () => void) =>
    (e: EvtPointeur<HTMLElement>) => {
      e.stopPropagation();
      avant?.();
      e.currentTarget.setPointerCapture(e.pointerId);
      geste.current = { x: e.clientX, y: e.clientY, depart: plan, bouge: false };
      const bouger = (m: PointerEvent) => {
        const g = geste.current;
        if (!g) return;
        const dx = (m.clientX - g.x) / px;
        if (!g.bouge && Math.abs(m.clientX - g.x) < 3 && Math.abs(m.clientY - g.y) < 3) return;
        if (!g.bouge) onDebut();
        g.bouge = true;
        onChange(appliquer(dx, g.depart, m.clientY - g.y));
      };
      const fin = () => {
        geste.current = null;
        window.removeEventListener('pointermove', bouger);
        window.removeEventListener('pointerup', fin);
      };
      window.addEventListener('pointermove', bouger);
      window.addEventListener('pointerup', fin);
    };
}
