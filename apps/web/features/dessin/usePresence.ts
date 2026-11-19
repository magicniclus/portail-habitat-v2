'use client';

import { useEffect, useState } from 'react';

/**
 * Garde la dernière valeur affichée le temps de l'animation de sortie : un panneau qui se
 * ferme reste monté `duree` ms avec `sortie` à vrai, puis disparaît.
 */
export function usePresence<T>(valeur: T | null, duree = 180) {
  const [gardee, setGardee] = useState<T | null>(valeur);
  const [precedente, setPrecedente] = useState<T | null>(valeur);
  if (valeur !== precedente) {
    setPrecedente(valeur);
    if (valeur !== null) setGardee(valeur);
  }
  useEffect(() => {
    if (valeur !== null) return;
    const t = setTimeout(() => setGardee(null), duree);
    return () => clearTimeout(t);
  }, [valeur, duree]);
  return { rendu: valeur ?? gardee, sortie: valeur === null && gardee !== null };
}
