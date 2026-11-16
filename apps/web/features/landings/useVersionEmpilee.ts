'use client';

import { useEffect, useState } from 'react';

/**
 * Animations pilotées par le défilement (panneau collant) remplacées par une version empilée :
 * mouvement réduit demandé, téléphone (< 768 px), ou écran trop bas pour tenir le panneau entier.
 */
const REQUETE = '(prefers-reduced-motion: reduce), (max-width: 767px), (max-height: 700px)';

export function useVersionEmpilee(): boolean {
  const [empilee, setEmpilee] = useState(false);
  useEffect(() => {
    const m = matchMedia(REQUETE);
    const suivre = () => setEmpilee(m.matches);
    suivre();
    m.addEventListener('change', suivre);
    return () => m.removeEventListener('change', suivre);
  }, []);
  return empilee;
}
