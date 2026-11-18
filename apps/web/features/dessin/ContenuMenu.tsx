'use client';

import type { TypeMur } from '@ph/core/dessin';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useState, type Dispatch } from 'react';
import { Chiffrage } from './Chiffrage';
import type { Action, EtatEditeur, Menu } from './etat';
import { GuideDemarrage } from './GuideDemarrage';

export const TITRES_MENU: Record<Menu, string> = {
  structure: 'Structure',
  equiper: 'Équiper',
  finitions: 'Finitions',
  chiffrer: 'Chiffrer',
  rendu: 'Rendu',
  aide: 'Aide',
};

const MURS: { type: TypeMur; libelle: string; detail: string }[] = [
  { type: 'mur', libelle: 'Mur', detail: 'Épaisseur 20 cm' },
  { type: 'cloison', libelle: 'Cloison', detail: 'Épaisseur 7 cm' },
  { type: 'demi_mur', libelle: 'Demi-mur', detail: 'Hauteur 1,10 m' },
  { type: 'muret', libelle: 'Muret', detail: 'Hauteur 60 cm' },
  { type: 'separation', libelle: 'Séparation invisible', detail: 'Sépare deux pièces sans mur' },
];

/** Catégories livrées avec les sous-lots suivants (DESSIN.md §10). */
const A_VENIR: Partial<Record<Menu, string[]>> = {
  structure: ['Portes & fenêtres', 'Escaliers', 'Toiture & combles', 'Terrasse, terrain, piscine'],
  equiper: ['Cuisine', 'Salle de bain', 'Chambre', 'Dressing', 'Bureau', 'Mobilier', 'Luminaires'],
  finitions: ['Peinture', 'Papier peint', 'Carrelage', 'Parquet', 'Parement', 'Façade'],
  rendu: ['Vue 3D', 'Visite', 'Photo HD'],
};

const ligne =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-blanc px-2.5 py-2 text-left font-[inherit] text-texte hover:bg-neutre-100';

function Structure({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const [murs, setMurs] = useState(false);
  if (murs)
    return (
      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => setMurs(false)}
          className="flex min-h-11 cursor-pointer items-center gap-1 justify-self-start border-0 bg-transparent px-1 text-sm font-semibold text-accent-700"
        >
          <CaretLeftIcon aria-hidden="true" /> Structure
        </button>
        <p className="m-0 px-1 text-[13px] leading-5 text-neutre-800">
          Choisissez un type puis cliquez sur le plan pour poser chaque point. Double-clic ou Échap
          pour finir.
        </p>
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {MURS.map((m) => {
            const actif = etat.outil === 'mur' && etat.typeMur === m.type;
            return (
              <li key={m.type}>
                <button
                  type="button"
                  aria-pressed={actif}
                  className={`${ligne} ${actif ? 'border-accent-300 bg-accent-100' : ''}`}
                  onClick={() => dispatch({ type: 'outil', outil: 'mur', typeMur: m.type })}
                >
                  <span className="flex-1">
                    <span className="block font-semibold">{m.libelle}</span>
                    <span className="text-[13px] text-neutre-700">{m.detail}</span>
                  </span>
                  <span className="text-xs font-bold text-accent-700">Tracer</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  return (
    <ul className="m-0 grid list-none gap-0.5 p-0">
      <li>
        <button type="button" className={ligne} onClick={() => setMurs(true)}>
          <span className="flex-1">
            <span className="block font-semibold">Murs & cloisons</span>
            <span className="text-[13px] text-neutre-700">Tracé point par point</span>
          </span>
          <CaretRightIcon aria-hidden="true" />
        </button>
      </li>
      <li>
        <button
          type="button"
          aria-pressed={etat.outil === 'piece'}
          className={`${ligne} ${etat.outil === 'piece' ? 'border-accent-300 bg-accent-100' : ''}`}
          onClick={() => dispatch({ type: 'outil', outil: 'piece' })}
        >
          <span className="flex-1">
            <span className="block font-semibold">Pièce rectangulaire</span>
            <span className="text-[13px] text-neutre-700">Deux coins opposés, quatre murs</span>
          </span>
        </button>
      </li>
    </ul>
  );
}

/** Contenu du panneau ouvert depuis le rail de gauche. */
export function ContenuMenu({
  menu,
  etat,
  dispatch,
}: {
  menu: Menu;
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  if (menu === 'chiffrer') return <Chiffrage etat={etat} />;
  if (menu === 'aide')
    return (
      <div className="grid gap-4">
        <GuideDemarrage etat={etat} />
        <div className="grid gap-1.5 px-1 text-sm leading-5 text-neutre-800">
          <p className="m-0 font-bold text-texte">Raccourcis</p>
          <p className="m-0">Ctrl + Z : annuler · Ctrl + Maj + Z : rétablir</p>
          <p className="m-0">Échap : finir le tracé · Suppr : supprimer le mur choisi</p>
          <p className="m-0">Flèches : déplacer le mur choisi (Maj : par 10 cm)</p>
        </div>
      </div>
    );
  return (
    <div className="grid gap-5">
      {menu === 'structure' ? <Structure etat={etat} dispatch={dispatch} /> : null}
      <div className="grid gap-1.5 px-1">
        <p className="m-0 text-xs font-bold tracking-wide text-neutre-700 uppercase">Bientôt</p>
        <ul className="m-0 grid list-none gap-1 p-0 text-sm text-neutre-800">
          {(A_VENIR[menu] ?? []).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
