'use client';

import { requeteDerniereTraceCycle } from '@ph/firebase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient, firestoreClient } from '@/lib/firebaseClient';

/**
 * Journal en direct (ADMIN §3) : écoute de la dernière trace du moteur ; à chaque nouvelle
 * décision, la page est relue côté serveur (noms d'entreprise, filtre). Sans session Firebase
 * dans le navigateur : relecture au retour sur l'onglet.
 */
export function JournalEnDirect() {
  const router = useRouter();
  const [direct, setDirect] = useState(false);
  useEffect(() => {
    let actif = true;
    let arreter: (() => void) | undefined;
    let premier = true;
    const auRetour = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    void (async () => {
      const auth = await authClient();
      await auth.authStateReady();
      if (!actif || !auth.currentUser) return;
      const [db, m] = await Promise.all([firestoreClient(), import('firebase/firestore')]);
      if (!actif) return;
      arreter = m.onSnapshot(
        requeteDerniereTraceCycle(m, db),
        () => {
          setDirect(true);
          if (premier) premier = false;
          else router.refresh();
        },
        () => setDirect(false),
      );
    })();
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      actif = false;
      arreter?.();
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [router]);
  return (
    <p className="m-0 flex items-center gap-2 text-sm text-neutre-700" aria-live="polite">
      <span
        aria-hidden="true"
        className={`inline-block size-2.5 rounded-full ${direct ? 'bg-succes' : 'bg-neutre-400'}`}
      />
      {direct ? 'En direct' : 'Relu à chaque retour sur l’onglet'}
    </p>
  );
}
