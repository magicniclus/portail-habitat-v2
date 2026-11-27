'use client';

import type { Dispatch } from 'react';
import type { Action, EtatEditeur } from '../etat';

/**
 * Réglage rapide posé sur la vue 3D : murs avant abaissés (maison de poupée) ou murs entiers,
 * d'un clic, sans passer par le menu Rendu. Absent en vue extérieure (maison toujours fermée).
 */
export function ReglagesVue3D({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  if (etat.vueExterieure) return null;
  const options = [
    { poupee: true, libelle: 'Murs abaissés' },
    { poupee: false, libelle: 'Murs entiers' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Murs en 3D"
      className="absolute top-3 left-3 z-10 flex gap-1 rounded-xl bg-blanc/95 p-1 shadow-md ring-1 ring-neutre-200"
    >
      {options.map((o) => {
        const oui = etat.rendu.poupee === o.poupee;
        return (
          <button
            key={o.libelle}
            type="button"
            role="radio"
            aria-checked={oui}
            onClick={() => dispatch({ type: 'rendu', reglages: { poupee: o.poupee } })}
            className={`min-h-11 cursor-pointer rounded-lg border-0 px-3 text-sm font-semibold font-[inherit] transition-colors ${oui ? 'bg-accent text-blanc' : 'bg-transparent text-texte hover:bg-neutre-100'}`}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
