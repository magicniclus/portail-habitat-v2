'use client';

import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';

/** Enregistrer et Publier : une action à la fois, message de succès ou d'erreur. */
export function useActionsEditeur(enregistrer: () => Promise<string | null>) {
  const [message, setMessage] = useState<{ ton: 'succes' | 'danger'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const executer = async (f: () => Promise<string | null>, succes: string) => {
    setEnCours(true);
    setMessage(null);
    const erreur = await f();
    setEnCours(false);
    setMessage(erreur ? { ton: 'danger', texte: erreur } : { ton: 'succes', texte: succes });
  };
  const publier = () =>
    executer(async () => {
      const e = await enregistrer();
      if (e) return e;
      const r = await posterJson<{ version: number }>('/api/pro/site/publier', {});
      return r.ok ? null : r.message;
    }, 'Site publié : il est en ligne en moins d’une minute.');
  return { message, enCours, executer, publier };
}
