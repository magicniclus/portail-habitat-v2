'use client';

import { useState } from 'react';
import { afficherDonnee } from './actions';

/**
 * Donnée personnelle masquée par défaut (`c•••@gmail.com`) ; « Afficher » la révèle et journalise
 * la consultation (ADM-02). Le rôle lecture ne voit jamais le bouton.
 */
export function DonneePersonnelle({
  masque,
  cible,
  champ,
  peutAfficher,
}: {
  masque: string;
  cible: string;
  champ: string;
  peutAfficher: boolean;
}) {
  const [valeur, setValeur] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const afficher = async () => {
    const r = await afficherDonnee(cible, champ);
    if (r.ok) setValeur(r.data);
    else setErreur(r.message);
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>{valeur ?? masque}</span>
      {peutAfficher && valeur === null ? (
        <button
          type="button"
          onClick={() => void afficher()}
          className="min-h-11 cursor-pointer rounded-md px-2 text-sm font-semibold text-accent-700 underline"
        >
          Afficher
        </button>
      ) : null}
      {erreur ? <span className="text-sm text-danger">{erreur}</span> : null}
    </span>
  );
}
