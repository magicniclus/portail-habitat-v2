'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Étapes pendant lesquelles Claude ou le robot de rendu travaillent. */
const EN_COURS = new Set(['transcription', 'montage', 'captures', 'rendu']);

/**
 * Suit le projet pendant que le robot ou Claude travaillent : la page est relue côté serveur
 * toutes les 5 s (aucune écoute Firestore dans le navigateur, donc aucun droit à y avoir), et
 * plus du tout une fois l'étape terminée.
 */
export function EcouteProjet({ statut }: { statut: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!EN_COURS.has(statut)) return;
    const minuterie = setInterval(() => router.refresh(), 5_000);
    return () => clearInterval(minuterie);
  }, [router, statut]);
  return null;
}
