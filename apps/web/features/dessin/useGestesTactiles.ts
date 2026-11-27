'use client';

import type { Point } from '@ph/core/dessin';
import { useRef, type Dispatch, type PointerEvent } from 'react';
import type { Action } from './etat';
import type { Camera, MoteurCamera } from './moteurCamera';

const APPUI_LONG_MS = 500;
const TOLERANCE_PX = 10;

/**
 * Gestes du plan au doigt (DES-46) : deux doigts pour zoomer et faire glisser à la fois (le
 * point du plan sous les doigts les suit), appui long sur un élément pour ouvrir ses propriétés.
 * Souris et stylet gardent leur comportement.
 */
export function useGestesTactiles(
  camera: MoteurCamera,
  /** Un second doigt arrive : le glisser à un doigt s'arrête. */
  annulerGlisser: () => void,
  dispatch: Dispatch<Action>,
  /** Lu au moment de l'appui long : un élément est-il sélectionné ? */
  selection: { current: boolean },
) {
  const doigts = useRef(new Map<number, { x: number; y: number }>());
  const pincement = useRef<{ distance: number; milieu: Point; cam: Camera } | null>(null);
  const appui = useRef<{ x: number; y: number; minuterie: ReturnType<typeof setTimeout> } | null>(
    null,
  );
  const annulerAppui = () => {
    if (appui.current) clearTimeout(appui.current.minuterie);
    appui.current = null;
  };
  const milieu = (): Point => {
    const [a, b] = [...doigts.current.values()];
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 };
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
        annulerGlisser();
        camera.arreter();
        pincement.current = { distance: ecart(), milieu: milieu(), cam: camera.cam };
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
      if (p && doigts.current.size === 2 && p.distance > 0) {
        // Le plan suit les doigts : glissé du déplacement du milieu, zoomé de leur écartement.
        const m = milieu();
        const k = 1000 / p.cam.zoom;
        const depart = {
          ...p.cam,
          cx: p.cam.cx - (m.x - p.milieu.x) * k,
          cy: p.cam.cy - (m.y - p.milieu.y) * k,
        };
        camera.zoomerVers(
          (p.cam.zoom * ecart()) / p.distance,
          { clientX: m.x, clientY: m.y },
          depart,
        );
      }
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
