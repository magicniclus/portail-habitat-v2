'use client';

import { refProjetStudio } from '@ph/firebase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authClient, firestoreClient } from '@/lib/firebaseClient';

/**
 * Suit le projet en direct (robot de rendu, Claude) : à chaque changement du document, la page
 * est relue côté serveur. Sans session Firebase dans le navigateur : relecture toutes les 10 s.
 */
export function EcouteProjet({ projetId }: { projetId: string }) {
  const router = useRouter();
  useEffect(() => {
    let actif = true;
    let arreter: (() => void) | undefined;
    let premier = true;
    void (async () => {
      const auth = await authClient();
      await auth.authStateReady();
      if (!actif) return;
      if (!auth.currentUser) {
        const minuterie = setInterval(() => router.refresh(), 10_000);
        arreter = () => clearInterval(minuterie);
        return;
      }
      const [db, m] = await Promise.all([firestoreClient(), import('firebase/firestore')]);
      if (!actif) return;
      arreter = m.onSnapshot(refProjetStudio(m, db, projetId), () => {
        if (premier) premier = false;
        else router.refresh();
      });
    })();
    return () => {
      actif = false;
      arreter?.();
    };
  }, [router, projetId]);
  return null;
}
