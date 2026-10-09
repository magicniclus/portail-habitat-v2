'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/** Appel d'une route `/api/pro/equipe/*` : erreur affichable, page rafraîchie en cas de succès. */
export function useActionEquipe() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const appeler = async (action: string, corps: Record<string, unknown>): Promise<boolean> => {
    setEnCours(true);
    setErreur(null);
    const r = await posterJson<unknown>(`/api/pro/equipe/${action}`, corps);
    setEnCours(false);
    if (!r.ok) {
      setErreur(r.message);
      return false;
    }
    router.refresh();
    return true;
  };
  return { appeler, erreur, enCours };
}
