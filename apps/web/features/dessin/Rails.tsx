'use client';

import {
  CalculatorIcon,
  CameraIcon,
  CornersOutIcon,
  CouchIcon,
  CursorIcon,
  HouseLineIcon,
  KeyboardIcon,
  LineSegmentIcon,
  MagnetIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PaintRollerIcon,
  QuestionIcon,
  RulerIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  TextAaIcon,
  TextTIcon,
  WallIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { Dispatch, ReactNode } from 'react';
import { BoutonRail } from './BoutonRail';
import { OUVRIR_RACCOURCIS } from './raccourcis';
import { ZOOM_DEFAUT, type Action, type EtatEditeur, type Menu, type Outil } from './etat';

const rail = 'flex h-full flex-none flex-col gap-1 overflow-y-auto border-trait bg-blanc py-2';

const Separateur = () => <span aria-hidden="true" className="mx-3 my-1 h-px bg-trait" />;

const MENUS: { menu: Menu; libelle: string; Icone: Icon }[] = [
  { menu: 'structure', libelle: 'Structure', Icone: HouseLineIcon },
  { menu: 'equiper', libelle: 'Équiper', Icone: CouchIcon },
  { menu: 'finitions', libelle: 'Finitions', Icone: PaintRollerIcon },
  { menu: 'chiffrer', libelle: 'Chiffrer', Icone: CalculatorIcon },
  { menu: 'rendu', libelle: 'Rendu', Icone: CameraIcon },
];

/** Rail de gauche : un clic ouvre le menu, un second clic le replie. */
export function RailMenus({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const ouvrir = (menu: Menu) => () => dispatch({ type: 'menu', menu });
  return (
    <nav aria-label="Menus du plan" className={`${rail} w-[76px] border-r`}>
      {MENUS.map(({ menu, libelle, Icone }) => (
        <BoutonRail
          key={menu}
          libelle={libelle}
          Icone={Icone}
          actif={etat.menu === menu}
          onClick={ouvrir(menu)}
          avecTexte
        />
      ))}
      <span className="flex-1" />
      <BoutonRail
        libelle="Aide"
        Icone={QuestionIcon}
        actif={etat.menu === 'aide'}
        onClick={ouvrir('aide')}
        avecTexte
      />
    </nav>
  );
}

const OUTILS: { outil: Outil; libelle: string; Icone: Icon; touche: string }[] = [
  { outil: 'selection', libelle: 'Sélectionner', Icone: CursorIcon, touche: 'V' },
  { outil: 'mur', libelle: 'Tracer un mur', Icone: WallIcon, touche: 'M' },
  { outil: 'piece', libelle: 'Dessiner une pièce', Icone: SquareIcon, touche: 'P' },
  { outil: 'cote', libelle: 'Coter (deux clics)', Icone: LineSegmentIcon, touche: 'K' },
  { outil: 'texte', libelle: 'Ajouter un texte', Icone: TextTIcon, touche: 'T' },
];

/** Rail de droite : outils, affichage, zoom et panneau des propriétés. */
export function RailOutils({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}): ReactNode {
  return (
    <div
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Outils du plan"
      className={`${rail} w-[60px] border-l`}
    >
      {OUTILS.map(({ outil, libelle, Icone, touche }) => (
        <BoutonRail
          key={outil}
          libelle={libelle}
          touche={touche}
          Icone={Icone}
          actif={etat.outil === outil}
          onClick={() => dispatch({ type: 'outil', outil })}
          avecTexte={false}
        />
      ))}
      <Separateur />
      <BoutonRail
        libelle="Magnétisme"
        touche="A"
        Icone={MagnetIcon}
        actif={etat.aimant}
        onClick={() => dispatch({ type: 'aimant' })}
        avecTexte={false}
      />
      <BoutonRail
        libelle="Afficher les cotes"
        Icone={RulerIcon}
        actif={etat.calques.cotes}
        onClick={() => dispatch({ type: 'calque', cle: 'cotes' })}
        avecTexte={false}
      />
      <BoutonRail
        libelle="Afficher les surfaces"
        Icone={TextAaIcon}
        actif={etat.calques.surfaces}
        onClick={() => dispatch({ type: 'calque', cle: 'surfaces' })}
        avecTexte={false}
      />
      <Separateur />
      <BoutonRail
        libelle="Zoomer"
        Icone={MagnifyingGlassPlusIcon}
        actif={false}
        onClick={() => dispatch({ type: 'zoom', zoom: etat.zoom * 1.25 })}
        avecTexte={false}
      />
      <span className="text-center text-[11px] font-bold text-neutre-800" aria-live="polite">
        {Math.round((etat.zoom / ZOOM_DEFAUT) * 100)} %
      </span>
      <BoutonRail
        libelle="Dézoomer"
        Icone={MagnifyingGlassMinusIcon}
        actif={false}
        onClick={() => dispatch({ type: 'zoom', zoom: etat.zoom / 1.25 })}
        avecTexte={false}
      />
      <BoutonRail
        libelle="Ajuster à l’écran"
        Icone={CornersOutIcon}
        actif={false}
        onClick={() => dispatch({ type: 'ajuster' })}
        avecTexte={false}
      />
      <span className="flex-1" />
      <BoutonRail
        libelle="Raccourcis clavier"
        touche="?"
        Icone={KeyboardIcon}
        actif={false}
        onClick={() => window.dispatchEvent(new Event(OUVRIR_RACCOURCIS))}
        avecTexte={false}
      />
      <BoutonRail
        libelle="Propriétés"
        Icone={SlidersHorizontalIcon}
        actif={etat.proprietes}
        onClick={() => dispatch({ type: 'proprietes' })}
        avecTexte={false}
      />
    </div>
  );
}
