'use client';

import type { Icon } from '@phosphor-icons/react';

/** Bouton des rails : icône (et libellé dans le rail de gauche), état actif, raccourci rappelé. */
export function BoutonRail({
  libelle,
  Icone,
  actif,
  onClick,
  avecTexte,
  touche,
}: {
  libelle: string;
  Icone: Icon;
  actif: boolean;
  onClick: () => void;
  avecTexte: boolean;
  /** Raccourci clavier, rappelé dans l'infobulle. */
  touche?: string;
}) {
  return (
    <button
      type="button"
      title={touche ? `${libelle} (${touche})` : libelle}
      aria-label={avecTexte ? undefined : libelle}
      aria-pressed={actif}
      onClick={onClick}
      className={`relative mx-1.5 flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-0 px-1 py-1.5 text-[11px] leading-tight font-semibold transition-colors duration-150 ${actif ? 'bg-accent-100 text-accent-700' : 'bg-transparent text-neutre-800 hover:bg-neutre-100'}`}
    >
      {actif && avecTexte ? (
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 -left-1.5 w-[3px] rounded-r bg-accent"
        />
      ) : null}
      <Icone size={22} weight={actif ? 'fill' : 'regular'} aria-hidden="true" />
      {avecTexte ? libelle : null}
    </button>
  );
}
