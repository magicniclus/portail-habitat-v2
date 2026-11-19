'use client';

import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

/** Bouton des rails : icône (et libellé à gauche) ; état actif plein ou en bascule. */
export function BoutonRail({
  libelle,
  Icone,
  actif,
  onClick,
  avecTexte,
  plein = false,
}: {
  libelle: string;
  Icone: Icon;
  actif: boolean;
  onClick: () => void;
  avecTexte: boolean;
  /** Outil choisi : fond accent plein (un seul à la fois) ; sinon simple bascule. */
  plein?: boolean;
}) {
  const teinte = actif
    ? plein
      ? 'bg-accent text-blanc shadow-sm'
      : 'bg-blanc text-accent-700 ring-1 ring-accent-300'
    : 'bg-transparent text-neutre-800 hover:bg-neutre-100';
  return (
    <button
      type="button"
      title={libelle}
      aria-label={avecTexte ? undefined : libelle}
      aria-pressed={actif}
      onClick={onClick}
      className={`relative mx-1.5 flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-0 px-1 py-1.5 text-[11px] leading-tight font-semibold transition-colors duration-150 ${teinte}`}
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

/** Groupe du rail de droite : boutons réunis sur un fond léger, avec un titre court. */
export function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={titre}
      className="mx-1.5 grid gap-0.5 rounded-2xl bg-neutre-100 py-1"
    >
      <span
        aria-hidden="true"
        className="text-center text-[9px] font-bold tracking-wide text-neutre-700 uppercase"
      >
        {titre}
      </span>
      {children}
    </div>
  );
}
