'use client';

import { useState } from 'react';
import { posterJson } from '@/lib/posterJson';
import { messagePublication, type ResultatPublication } from '@/features/monSite/publication';

/** Enregistrer et Publier : une action à la fois, message de succès ou d'erreur. */
export function useActionsEditeur(enregistrer: () => Promise<string | null>) {
  const [message, setMessage] = useState<{
    ton: 'succes' | 'danger' | 'attention';
    texte: string;
  } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const executer = async (f: () => Promise<string | null>, succes: string) => {
    setEnCours(true);
    setMessage(null);
    const erreur = await f();
    setEnCours(false);
    setMessage(erreur ? { ton: 'danger', texte: erreur } : { ton: 'succes', texte: succes });
  };
  const publier = async () => {
    setEnCours(true);
    setMessage(null);
    const e = await enregistrer();
    const r = e ? null : await posterJson<ResultatPublication>('/api/pro/site/publier', {});
    setEnCours(false);
    if (e) return setMessage({ ton: 'danger', texte: e });
    setMessage(r!.ok ? messagePublication(r!.data) : { ton: 'danger', texte: r!.message });
  };
  return { message, enCours, executer, publier };
}
