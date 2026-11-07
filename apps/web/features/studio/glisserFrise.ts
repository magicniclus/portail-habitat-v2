'use client';

import type { PlanMontage } from '@ph/core/studio';
import { useRef, type PointerEvent as EvtPointeur } from 'react';

/**
 * Geste de glisser dans la frise : part d'une copie du plan, convertit le déplacement en ms et
 * applique `appliquer(dx, départ)` à chaque mouvement. `onDebut` est appelé au premier
 * mouvement réel (au-delà de 3 px) pour mémoriser l'état d'avant (« Annuler »).
 */
export function useGlisser(
  px: number,
  plan: PlanMontage,
  onDebut: () => void,
  onChange: (p: PlanMontage) => void,
) {
  const geste = useRef<{ x: number; depart: PlanMontage; bouge: boolean } | null>(null);
  return (appliquer: (dx: number, depart: PlanMontage) => PlanMontage, avant?: () => void) =>
    (e: EvtPointeur<HTMLElement>) => {
      e.stopPropagation();
      avant?.();
      e.currentTarget.setPointerCapture(e.pointerId);
      geste.current = { x: e.clientX, depart: plan, bouge: false };
      const bouger = (m: PointerEvent) => {
        const g = geste.current;
        if (!g) return;
        const dx = (m.clientX - g.x) / px;
        if (!g.bouge && Math.abs(m.clientX - g.x) < 3) return;
        if (!g.bouge) onDebut();
        g.bouge = true;
        onChange(appliquer(dx, g.depart));
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
