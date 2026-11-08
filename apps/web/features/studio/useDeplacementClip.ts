'use client';

import { aimanter, insererClip, type Clip, type Frise } from '@ph/core/studio';
import { useState, type PointerEvent as EvtPointeur } from 'react';

/** Clip en train d'être glissé : décalage à l'écran et place visée (piste, début). */
export interface Deplacement {
  clipId: string;
  dx: number;
  dy: number;
  pisteId: string;
  debut: number;
}

/**
 * Glisser un clip « comme dans un logiciel de montage » : pendant le geste le clip suit le
 * curseur (rien ne change dans la frise), un repère montre où il tombera ; au lâcher, il est
 * inséré à cet endroit et les clips suivants glissent pour lui faire de la place (un seul pas
 * d'annulation).
 */
export function useDeplacementClip(o: {
  frise: Frise;
  px: number;
  hauteurs: number[];
  reperes: (sauf: string) => number[];
  changer: (f: Frise) => void;
}) {
  const [deplacement, setDeplacement] = useState<Deplacement | null>(null);
  const pisteSous = (depart: number, dy: number) => {
    let i = depart;
    let reste = dy;
    while (reste > o.hauteurs[i]! / 2 && i < o.hauteurs.length - 1) reste -= o.hauteurs[i++]!;
    while (reste < -o.hauteurs[i]! / 2 && i > 0) reste += o.hauteurs[--i]!;
    return o.frise.pistes[i]!;
  };
  const demarrer = (e: EvtPointeur<HTMLElement>, c: Clip, indexPiste: number) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const y0 = e.clientY;
    const reperes = o.reperes(c.id);
    let dernier: Deplacement | null = null;
    const bouger = (m: PointerEvent) => {
      const dx = m.clientX - x0;
      const dy = m.clientY - y0;
      if (!dernier && Math.hypot(dx, dy) < 4) return;
      const debut = Math.max(0, Math.round(aimanter(c.debut + dx / o.px, reperes, 8 / o.px)));
      dernier = { clipId: c.id, dx, dy, pisteId: pisteSous(indexPiste, dy).id, debut };
      setDeplacement(dernier);
    };
    const fin = () => {
      window.removeEventListener('pointermove', bouger);
      window.removeEventListener('pointerup', fin);
      setDeplacement(null);
      if (dernier) o.changer(insererClip(o.frise, c.id, dernier.pisteId, dernier.debut));
    };
    window.addEventListener('pointermove', bouger);
    window.addEventListener('pointerup', fin);
  };
  return { deplacement, demarrer };
}
