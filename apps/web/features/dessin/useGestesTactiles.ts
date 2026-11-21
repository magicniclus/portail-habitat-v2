'use client';

import { useRef, type Dispatch, type PointerEvent } from 'react';
import type { Action } from './etat';

const APPUI_LONG_MS = 500;
const TOLERANCE_PX = 10;

/**
 * Gestes du plan au doigt (DES-46) : pincer pour zoomer (deux doigts), appui long sur un élément
 * pour ouvrir ses propriétés (ses actions : modifier, tourner, supprimer). Souris et stylet
 * gardent leur comportement.
 */
export function useGestesTactiles(
  zoom: number,
  dispatch: Dispatch<Action>,
  /** Lu au moment de l'appui long : un élément est-il sélectionné ? */
  selection: { current: boolean },
) {
  const doigts = useRef(new Map<number, { x: number; y: number }>());
  const pincement = useRef<{ distance: number; zoom: number } | null>(null);
  const appui = useRef<{ x: number; y: number; minuterie: ReturnType<typeof setTimeout> } | null>(
    null,
  );
  const annulerAppui = () => {
    if (appui.current) clearTimeout(appui.current.minuterie);
    appui.current = null;
  };
  const ecart = () => {
    const [a, b] = [...doigts.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  return {
    onPointerDownCapture(ev: PointerEvent) {
      if (ev.pointerType !== 'touch') return;
      doigts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (doigts.current.size === 2) {
        annulerAppui();
        pincement.current = { distance: ecart(), zoom };
        return;
      }
      annulerAppui();
      appui.current = {
        x: ev.clientX,
        y: ev.clientY,
        // L'élément touché est déjà sélectionné par son propre gestionnaire.
        minuterie: setTimeout(() => {
          appui.current = null;
          if (selection.current) dispatch({ type: 'proprietes', ouvert: true });
        }, APPUI_LONG_MS),
      };
    },
    onPointerMoveCapture(ev: PointerEvent) {
      if (ev.pointerType !== 'touch' || !doigts.current.has(ev.pointerId)) return;
      doigts.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const a = appui.current;
      if (a && Math.hypot(ev.clientX - a.x, ev.clientY - a.y) > TOLERANCE_PX) annulerAppui();
      const p = pincement.current;
      if (p && doigts.current.size === 2 && p.distance > 0)
        dispatch({ type: 'zoom', zoom: (p.zoom * ecart()) / p.distance });
    },
    onPointerUpCapture(ev: PointerEvent) {
      doigts.current.delete(ev.pointerId);
      annulerAppui();
      if (doigts.current.size < 2) pincement.current = null;
    },
    onPointerCancelCapture(ev: PointerEvent) {
      doigts.current.delete(ev.pointerId);
      annulerAppui();
      pincement.current = null;
    },
  };
}
