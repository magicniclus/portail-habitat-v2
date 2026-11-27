'use client';

import { useMediaQuery } from '@/lib/useMediaQuery';
import { COULEURS_PLAN } from '@ph/ui/tokens';
import type { CSSProperties } from 'react';

/** Écart des points du papier (px). */
const PAS = 24;

/**
 * Papier pointillé du plan (maquette) : un point tous les 24 px, accroché au dessin : il glisse
 * avec la vue au lieu de rester immobile sous elle.
 */
export function papier(vue: { x: number; y: number }, mmParPx: number): CSSProperties {
  const decalage = (mm: number) => ((((-mm / mmParPx) % PAS) + PAS) % PAS).toFixed(1);
  return {
    backgroundColor: COULEURS_PLAN.fond,
    backgroundImage: `radial-gradient(${COULEURS_PLAN.grille} 1px, transparent 1.2px)`,
    backgroundSize: `${PAS}px ${PAS}px`,
    backgroundPosition: `${decalage(vue.x)}px ${decalage(vue.y)}px`,
  };
}

/**
 * Hauteur (px) que la feuille du bas masque sur téléphone quand un panneau est ouvert (60 % de
 * l'écran, DES-46) : « Ajuster » cadre le dessin au-dessus d'elle.
 */
export function useReserveTelephone(panneauOuvert: boolean) {
  const telephone = useMediaQuery('(max-width: 899px)', false);
  // `telephone` n'est vrai que dans le navigateur : `window` y existe.
  return telephone && panneauOuvert ? Math.round(window.innerHeight * 0.6) : 0;
}
