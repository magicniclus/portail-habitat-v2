'use client';

import { useEffect, useRef } from 'react';
import { dessinerChaleur, dessinerDefilement } from './calques';
import type { CalqueComportement, DonneesCartes } from './types';

/** Calque dessiné (chaleur ou défilement), à demi-résolution pour rester léger. */
export function CanevasChaleur({
  calque,
  donnees,
  largeur,
  hauteur,
  opacite,
}: {
  calque: CalqueComportement;
  donnees: DonneesCartes;
  largeur: number;
  hauteur: number;
  opacite: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const echelle = 0.5;
    cv.width = Math.round(largeur * echelle);
    cv.height = Math.round(hauteur * echelle);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const cartes: Partial<Record<CalqueComportement, Record<string, number>>> = {
      clics: donnees.grilleClics,
      mouvements: donnees.grilleMouvements,
      attention: donnees.grilleAttention,
    };
    const carte = cartes[calque];
    if (carte) dessinerChaleur(ctx, carte, echelle);
    if (calque === 'defilement')
      dessinerDefilement(ctx, donnees.scroll, donnees.sessions, hauteur, echelle);
  }, [calque, donnees, largeur, hauteur]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: opacite }}
    />
  );
}
