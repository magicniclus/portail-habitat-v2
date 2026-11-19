'use client';

import { CaretRightIcon, CheckIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

const base =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[10px] border-2 px-2.5 py-2 text-left font-[inherit] text-texte';
const repos = 'border-transparent bg-blanc hover:bg-neutre-100';
export const ligne = `${base} ${repos}`;
const etatLigne = (oui: boolean) => `${base} ${oui ? 'border-accent bg-accent-100' : repos}`;

/** Pastille d'un outil : vide, ou pleine avec une coche quand l'outil est sélectionné. */
function Choix({ oui }: { oui: boolean }) {
  return oui ? (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-blanc">
      <CheckIcon weight="bold" className="size-3.5" aria-hidden="true" />
    </span>
  ) : (
    <span className="size-6 shrink-0 rounded-full border-2 border-neutre-300" aria-hidden="true" />
  );
}

/**
 * Ligne de menu. Avec `pressee`, c'est un outil : un clic le sélectionne (bordure, fond et coche),
 * puis on le pose sur le plan ; sinon, une flèche mène à un sous-menu.
 */
export function Ligne({
  titre,
  detail,
  action,
  apercu,
  pressee,
  onClick,
}: {
  titre: string;
  detail: string;
  action?: ReactNode;
  /** Vignette dessinée à gauche : ce que l'outil pose sur le plan. */
  apercu?: ReactNode;
  pressee?: boolean;
  onClick: () => void;
}) {
  const outil = pressee !== undefined;
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressee}
        className={etatLigne(Boolean(pressee))}
        onClick={onClick}
      >
        {apercu}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{titre}</span>
          <span className="text-[13px] text-neutre-700">
            {pressee ? 'Sélectionné · cliquez sur le plan' : detail}
          </span>
        </span>
        {action ?? (outil ? <Choix oui={pressee} /> : <CaretRightIcon aria-hidden="true" />)}
      </button>
    </li>
  );
}
