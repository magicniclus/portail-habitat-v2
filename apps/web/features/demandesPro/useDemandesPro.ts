'use client';

import { requeteAttributionsPro } from '@ph/firebase/client';
import type { DemandePro } from '@ph/firebase/pro';
import { useCallback, useEffect, useState } from 'react';
import { authClient, firestoreClient } from '@/lib/firebaseClient';
import { posterJson } from '@/lib/posterJson';

/**
 * PRO-01 : écoute des attributions de l'entreprise (règles : membre opérationnel) ; à chaque
 * changement, la liste filtrée est relue côté serveur (coordonnées selon le statut, PRO-02).
 * Sans session Firebase dans le navigateur : repli sur une relecture au retour sur l'onglet.
 */
export function useDemandesPro(initiales: DemandePro[], artisanId: string) {
  const [liste, setListe] = useState(initiales);
  const [tempsReel, setTempsReel] = useState(false);

  const recharger = useCallback(async () => {
    const r = await posterJson<DemandePro[]>('/api/pro/demandes', {});
    if (r.ok) setListe(r.data);
  }, []);

  useEffect(() => {
    let actif = true;
    let arreter: (() => void) | undefined;
    let premier = true;
    const auRetour = () => {
      if (document.visibilityState === 'visible') void recharger();
    };
    void (async () => {
      const auth = await authClient();
      await auth.authStateReady();
      if (!actif || !auth.currentUser) return;
      const [db, m] = await Promise.all([firestoreClient(), import('firebase/firestore')]);
      if (!actif) return;
      const requete = requeteAttributionsPro(m, db, artisanId);
      arreter = m.onSnapshot(
        requete,
        () => {
          setTempsReel(true);
          if (premier) premier = false;
          else void recharger();
        },
        () => setTempsReel(false),
      );
    })();
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      actif = false;
      arreter?.();
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [artisanId, recharger]);

  return { liste, recharger, tempsReel };
}
