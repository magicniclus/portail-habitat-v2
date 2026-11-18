'use client';

import type { Dispatch } from 'react';
import type { EspaceDessin } from './api';
import { Chiffrage } from './Chiffrage';
import { EquiperMenu } from './EquiperMenu';
import type { Action, EtatEditeur, Menu } from './etat';
import { FinitionsMenu } from './FinitionsMenu';
import { ListeRaccourcis } from './AideRaccourcis';
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
  if (menu === 'chiffrer')
    return <Chiffrage etat={etat} dispatch={dispatch} espace={espace} planId={planId} />;
  if (menu === 'equiper') return <EquiperMenu etat={etat} dispatch={dispatch} />;
  if (menu === 'rendu')
    return <RenduMenu etat={etat} dispatch={dispatch} espace={espace} planId={planId} />;
  if (menu === 'finitions') return <FinitionsMenu etat={etat} dispatch={dispatch} />;
  return (
    <div className="grid gap-4">
      <GuideDemarrage etat={etat} />
      <div className="grid gap-2 px-1">
        <p className="m-0 text-sm font-bold text-texte">Raccourcis (touche « ? »)</p>
        <ListeRaccourcis />
      </div>
    </div>
  );
}
