'use client';

import type { Frise } from '@ph/core/studio';
import { useState, useTransition } from 'react';
import { enregistrerFrise, fabriquerFrise, retoucher } from './actions';

type Message = { ton: 'succes' | 'danger'; texte: string } | null;

/**
 * Actions serveur de l'éditeur multipistes : enregistrer, enregistrer et fabriquer (le robot
 * filme les écrans manquants puis rend la vidéo), retouche par Claude. Garde la dernière frise
 * enregistrée (« modifié ») et le message de la barre du haut.
 */
export function useEnregistrementFrise(projetId: string, initiale: Frise) {
  const [enregistre, setEnregistre] = useState(initiale);
  const [message, setMessage] = useState<Message>(null);
  const [enCours, demarrer] = useTransition();
  const agir = (
    f: () => Promise<{ ok: true } | { ok: false; message: string }>,
    ok: string,
    apres?: () => void,
  ) =>
    demarrer(async () => {
      setMessage(null);
      const r = await f();
      if (r.ok) apres?.();
      setMessage(r.ok ? { ton: 'succes', texte: ok } : { ton: 'danger', texte: r.message });
    });
  return {
    enregistre,
    message,
    setMessage,
    enCours,
    enregistrer: (frise: Frise) =>
      agir(
        () => enregistrerFrise({ projetId, frise }),
        'Montage enregistré.',
        () => setEnregistre(frise),
      ),
    fabriquer: (frise: Frise) =>
      agir(
        () => fabriquerFrise({ projetId, frise }),
        'Enregistré : la vidéo est en fabrication.',
        () => setEnregistre(frise),
      ),
    retoucher: (demande: string) =>
      agir(() => retoucher({ projetId, demande }), 'Retouche lancée : Claude refait le montage.'),
  };
}
