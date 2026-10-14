'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/** Appel d'une route `/api/pro/site/…` : état d'envoi, message d'erreur, rafraîchissement. */
export function useAppelSite() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const appeler = async <R = unknown>(chemin: string, corps: object): Promise<R | null> => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<R>(chemin ? `/api/pro/site/${chemin}` : '/api/pro/site', corps);
    setEnCours(false);
    if (!r.ok) {
      setErreur(r.message);
      return null;
    }
    router.refresh();
    return r.data;
  };
  return { appeler, erreur, enCours };
}
