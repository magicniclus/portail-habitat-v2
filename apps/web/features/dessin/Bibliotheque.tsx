'use client';

import type { TypeMur } from '@ph/core/dessin';
import {
  CalculatorIcon,
  CameraIcon,
  CaretRightIcon,
  CouchIcon,
  HouseLineIcon,
  PaintRollerIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useState, type Dispatch } from 'react';
import { Chiffrage } from './Chiffrage';
import type { Action, EtatEditeur, OngletBibliotheque } from './etat';

const ONGLETS: { id: OngletBibliotheque; libelle: string; Icone: Icon }[] = [
  { id: 'structure', libelle: 'Structure', Icone: HouseLineIcon },
  { id: 'equiper', libelle: 'Équiper', Icone: CouchIcon },
  { id: 'finitions', libelle: 'Finitions', Icone: PaintRollerIcon },
  { id: 'chiffrer', libelle: 'Chiffrer', Icone: CalculatorIcon },
  { id: 'rendu', libelle: 'Rendu', Icone: CameraIcon },
];

const MURS: { type: TypeMur; libelle: string; detail: string }[] = [
  { type: 'mur', libelle: 'Mur', detail: 'Épaisseur 20 cm' },
  { type: 'cloison', libelle: 'Cloison', detail: 'Épaisseur 7 cm' },
  { type: 'demi_mur', libelle: 'Demi-mur', detail: 'Hauteur 1,10 m' },
  { type: 'muret', libelle: 'Muret', detail: 'Hauteur 60 cm' },
  { type: 'separation', libelle: 'Séparation invisible', detail: 'Sépare deux pièces sans mur' },
];

/** Catégories livrées avec les sous-lots suivants (DESSIN.md §10). */
const A_VENIR: Record<Exclude<OngletBibliotheque, 'chiffrer'>, string[]> = {
  structure: ['Portes & fenêtres', 'Escaliers', 'Toiture & combles', 'Terrasse, terrain, piscine'],
  equiper: ['Cuisine', 'Salle de bain', 'Chambre', 'Dressing', 'Bureau', 'Mobilier', 'Luminaires'],
  finitions: ['Peinture', 'Papier peint', 'Carrelage', 'Parquet', 'Parement', 'Façade'],
  rendu: ['Vue 3D', 'Visite', 'Photo HD'],
};

const ligne =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-blanc p-2 text-left font-[inherit] hover:bg-neutre-100';

function Structure({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert)
    return (
      <ul className="m-0 grid list-none gap-0.5 p-0">
        <li>
          <button type="button" className={ligne} onClick={() => setOuvert(true)}>
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
            className={ligne}
            aria-pressed={etat.outil === 'piece'}
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
  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => setOuvert(false)}
        className="cursor-pointer justify-self-start border-0 bg-transparent p-1 text-[13px] font-semibold text-accent-700"
      >
        ‹ Structure
      </button>
      <p className="m-0 px-1 text-[13px] text-neutre-800">
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
}

/** Bibliothèque (DESSIN.md §7) : recherche, onglets, listes. */
export function Bibliotheque({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Bibliothèque"
        className="grid grid-cols-5 border-b border-trait px-1.5"
      >
        {ONGLETS.map(({ id, libelle, Icone }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={etat.onglet === id}
            onClick={() => dispatch({ type: 'onglet', onglet: id })}
            className={`-mb-px flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 border-b-[2.5px] bg-transparent text-[11.5px] font-bold ${etat.onglet === id ? 'border-accent text-accent-700' : 'border-transparent text-neutre-800'}`}
          >
            <Icone size={20} aria-hidden="true" />
            {libelle}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5" role="tabpanel">
        {etat.onglet === 'chiffrer' ? (
          <Chiffrage etat={etat} />
        ) : (
          <div className="grid gap-4">
            {etat.onglet === 'structure' ? <Structure etat={etat} dispatch={dispatch} /> : null}
            <div className="grid gap-1.5 px-1">
              <p className="m-0 text-xs font-bold tracking-wide text-neutre-700 uppercase">
                Bientôt
              </p>
              <ul className="m-0 grid list-none gap-1 p-0 text-sm text-neutre-800">
                {A_VENIR[etat.onglet].map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
