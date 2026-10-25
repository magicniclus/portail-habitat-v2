'use client';

import { useSyncExternalStore } from 'react';

/** Vrai si la requête média correspond ; `serveur` au rendu serveur (avant hydratation). */
export function useMediaQuery(requete: string, serveur = true): boolean {
  return useSyncExternalStore(
    (rappel) => {
      const m = window.matchMedia(requete);
      m.addEventListener('change', rappel);
      return () => m.removeEventListener('change', rappel);
    },
    () => window.matchMedia(requete).matches,
    () => serveur,
  );
}
