'use client';

import type { Dispatch } from 'react';
import type { EspaceDessin } from './api';
import { Chiffrage } from './Chiffrage';
import { EquiperMenu } from './EquiperMenu';
import type { Action, EtatEditeur, Menu } from './etat';
import { FinitionsMenu } from './FinitionsMenu';
import { GuideDemarrage } from './GuideDemarrage';
import { RenduMenu } from './RenduMenu';
import { StructureMenu } from './StructureMenu';

export const TITRES_MENU: Record<Menu, string> = {
  structure: 'Structure',
  equiper: 'Équiper',
  finitions: 'Finitions',
  chiffrer: 'Chiffrer',
  rendu: 'Rendu',
  aide: 'Aide',
};

/** Contenu du panneau ouvert depuis le rail de gauche. */
export function ContenuMenu({
  menu,
  etat,
  dispatch,
  espace,
  planId,
}: {
  menu: Menu;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
  espace: EspaceDessin;
  planId: string;
}) {
  if (menu === 'structure')
    return <StructureMenu etat={etat} dispatch={dispatch} espace={espace} planId={planId} />;
  if (menu === 'chiffrer') return <Chiffrage etat={etat} />;
  if (menu === 'equiper') return <EquiperMenu etat={etat} dispatch={dispatch} />;
  if (menu === 'rendu') return <RenduMenu etat={etat} dispatch={dispatch} />;
  if (menu === 'finitions') return <FinitionsMenu etat={etat} dispatch={dispatch} />;
  return (
    <div className="grid gap-4">
      <GuideDemarrage etat={etat} />
      <div className="grid gap-1.5 px-1 text-sm leading-5 text-neutre-800">
        <p className="m-0 font-bold text-texte">Raccourcis</p>
        <p className="m-0">Ctrl + Z : annuler · Ctrl + Maj + Z : rétablir</p>
        <p className="m-0">Échap : finir le tracé · Suppr : supprimer l’élément choisi</p>
        <p className="m-0">Flèches : déplacer le mur ou l’objet choisi (Maj : par 10 cm)</p>
        <p className="m-0">R : tourner l’objet choisi d’un quart de tour</p>
      </div>
    </div>
  );
}
