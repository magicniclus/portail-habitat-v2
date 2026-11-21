'use client';

import { Banner } from '@ph/ui';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { posterJson } from '@/lib/posterJson';

/** Appel d'une route Devis & factures, puis rafraîchissement de la page ; erreur prête à afficher. */
export function useAppelDevis(): {
  appeler: (url: string, corps: object) => Promise<boolean>;
  enCours: boolean;
  erreur: ReactNode;
} {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const appeler = async (url: string, corps: object) => {
    setEnCours(true);
    setMessage(null);
    const r = await posterJson<unknown>(url, corps);
    setEnCours(false);
    if (!r.ok) {
      setMessage(r.message);
      return false;
    }
    router.refresh();
    return true;
  };
  return {
    appeler,
    enCours,
    erreur: message ? <Banner tone="danger">{message}</Banner> : null,
  };
}
