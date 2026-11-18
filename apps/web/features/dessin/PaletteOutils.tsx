'use client';

import { CursorIcon, MagnetIcon, SquareIcon, WallIcon, type Icon } from '@phosphor-icons/react';
import type { Dispatch } from 'react';
import type { Action, EtatEditeur, Outil } from './etat';

const OUTILS: { outil: Outil; libelle: string; Icone: Icon }[] = [
  { outil: 'selection', libelle: 'Sélection', Icone: CursorIcon },
  { outil: 'mur', libelle: 'Tracer un mur', Icone: WallIcon },
  { outil: 'piece', libelle: 'Dessiner une pièce', Icone: SquareIcon },
];

const bouton = (actif: boolean) =>
  `flex size-11 cursor-pointer items-center justify-center rounded-lg border-0 ${actif ? 'bg-accent text-blanc' : 'bg-transparent text-neutre-200 hover:bg-neutre-800'}`;

/** Palette d'outils verticale sur le plan (maquette) ; horizontale en bas sur téléphone. */
export function PaletteOutils({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Outils de dessin"
      className="flex gap-1 rounded-xl bg-texte p-1.5 shadow-md min-[900px]:flex-col"
    >
      {OUTILS.map(({ outil, libelle, Icone }) => (
        <button
          key={outil}
          type="button"
          title={libelle}
          aria-label={libelle}
          aria-pressed={etat.outil === outil}
          className={bouton(etat.outil === outil)}
          onClick={() => dispatch({ type: 'outil', outil })}
        >
          <Icone size={20} aria-hidden="true" />
        </button>
      ))}
      <span
        aria-hidden="true"
        className="m-1 h-px bg-neutre-700 max-[899px]:h-auto max-[899px]:w-px"
      />
      <button
        type="button"
        title="Magnétisme"
        aria-label="Magnétisme"
        aria-pressed={etat.aimant}
        className={bouton(etat.aimant)}
        onClick={() => dispatch({ type: 'aimant' })}
      >
        <MagnetIcon size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
