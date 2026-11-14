'use client';

import { useEffect, useState, type PointerEvent as EvtPointeur } from 'react';

const borne = (h: number) => Math.min(Math.max(180, h), Math.max(220, window.innerHeight - 280));

/**
 * Éditeur plein écran : la page derrière ne défile plus, et la frise se redimensionne en
 * tirant la barre qui la sépare de l'aperçu.
 */
export function useHauteurFrise(initiale = 300) {
  const [hauteur, setHauteur] = useState(initiale);
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => void (document.body.style.overflow = avant);
  }, []);
  const tirer = (e: EvtPointeur<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const y0 = e.clientY;
    const h0 = hauteur;
    const bouger = (m: PointerEvent) => setHauteur(borne(h0 + y0 - m.clientY));
    const fin = () => {
      window.removeEventListener('pointermove', bouger);
      window.removeEventListener('pointerup', fin);
    };
    window.addEventListener('pointermove', bouger);
    window.addEventListener('pointerup', fin);
  };
  return { hauteur, tirer };
}
