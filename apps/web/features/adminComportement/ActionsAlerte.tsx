'use client';

import { useState, useTransition } from 'react';
import { changerStatutAlerteAdmin } from './actions';

/** « Traitée » ou « Ignorer » : une alerte ignorée ne revient plus (audit côté serveur). */
export function ActionsAlerte({ alerteId }: { alerteId: string }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const agir = (statut: 'traitee' | 'ignoree') =>
    demarrer(async () => {
      setErreur(await changerStatutAlerteAdmin(alerteId, statut));
    });
  return (
    <>
      <button
        type="button"
        disabled={enCours}
        onClick={() => agir('traitee')}
        className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm underline"
      >
        Marquer traitée
      </button>
      <button
        type="button"
        disabled={enCours}
        onClick={() => agir('ignoree')}
        className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm text-neutre-700 underline"
      >
        Ignorer
      </button>
      {erreur ? (
        <span role="alert" className="text-sm text-danger">
          {erreur}
        </span>
      ) : null}
    </>
  );
}
