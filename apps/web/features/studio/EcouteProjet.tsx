'use client';

import { refProjetStudio } from '@ph/firebase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authClient, firestoreClient } from '@/lib/firebaseClient';

/**
 * Suit le projet en direct (robot de rendu, Claude) : à chaque changement du document, la page
 * est relue côté serveur. Droits du navigateur périmés (permission Studio ajoutée depuis la
 * connexion) : session renouvelée puis un nouvel essai ; sinon, relecture toutes les 10 s.
 */
export function EcouteProjet({ projetId }: { projetId: string }) {
  const router = useRouter();
  useEffect(() => {
    let actif = true;
    let arreter: (() => void) | undefined;
    const sondage = () => {
      const minuterie = setInterval(() => router.refresh(), 10_000);
      arreter = () => clearInterval(minuterie);
    };
    void (async () => {
      const auth = await authClient();
      await auth.authStateReady();
      if (!actif) return;
      const user = auth.currentUser;
      if (!user) return sondage();
      const [db, m] = await Promise.all([firestoreClient(), import('firebase/firestore')]);
      const ecouter = (nouvelEssai: boolean) => {
        if (!actif) return;
        let premier = true;
        arreter = m.onSnapshot(
          refProjetStudio(m, db, projetId),
          () => {
            if (premier) premier = false;
            else router.refresh();
          },
          () => {
            arreter?.();
            if (!actif) return;
            if (nouvelEssai)
              void user
                .getIdToken(true)
                .then(() => ecouter(false))
                .catch(sondage);
            else sondage();
          },
        );
      };
      ecouter(true);
    })();
    return () => {
      actif = false;
      arreter?.();
    };
  }, [router, projetId]);
  return null;
}
