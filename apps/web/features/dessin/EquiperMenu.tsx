'use client';

import {
  CATALOGUE_OBJETS,
  CATEGORIES_OBJETS,
  chercherObjets,
  formatLongueur,
  LIBELLES_CATEGORIE,
  triangleActivite,
  type CategorieObjet,
} from '@ph/core/dessin';
import { CaretLeftIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useState, type Dispatch } from 'react';
import { niveauDe, type Action, type EtatEditeur } from './etat';
import { CartesObjets, MiniatureObjet } from './CartesObjets';
import { CouleursCuisineMenu } from './CouleursCuisineMenu';
import { Ligne } from './LigneMenu';

const CONSEILS = {
  trop_petit: 'Évier, plaque et réfrigérateur sont très proches : on se gêne en cuisinant.',
  bon: 'Triangle d’activité équilibré.',
  trop_grand: 'Évier, plaque et réfrigérateur sont éloignés : beaucoup de pas en cuisinant.',
} as const;

/** Objet montré pour chaque univers dans la liste des univers. */
const VITRINE: Record<CategorieObjet, string> = {
  cuisine: 'evier-120',
  salle_de_bain: 'baignoire',
  chambre: 'lit-160',
  dressing: 'penderie',
  enfant: 'lit-enfant',
  bureau: 'bureau',
  sejour: 'canape-3',
  deco: 'plante-pot',
  electricite: 'prise',
  chauffage: 'radiateur',
  exterieur: 'salon-jardin',
};

/** Menu Équiper (DES-21 à DES-24) : recherche, univers, objets à placer d'un clic. */
export function EquiperMenu({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState<CategorieObjet | null>(null);
  const trouves = chercherObjets(recherche);
  const triangle = triangleActivite(niveauDe(etat));
  const choisi = etat.outil === 'objet' ? etat.catalogueId : null;
  const choisir = (id: string) => dispatch({ type: 'outil', outil: 'objet', catalogueId: id });
  return (
    <div className="grid gap-3">
      <label className="relative block">
        <span className="sr-only">Rechercher un meuble ou un équipement</span>
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="absolute top-3.5 left-3 text-neutre-700"
        />
        <input
          type="search"
          value={recherche}
          onChange={(ev) => setRecherche(ev.target.value)}
          placeholder="Lit, évier, radiateur…"
          className="min-h-11 w-full rounded-control border border-neutre-300 bg-blanc py-2 pr-3 pl-9 text-base"
        />
      </label>
      {recherche.trim() ? (
        trouves.length ? (
          <CartesObjets objets={trouves} choisi={choisi} choisir={choisir} />
        ) : (
          <p className="m-0 px-1 text-sm text-neutre-800">Aucun résultat.</p>
        )
      ) : categorie ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setCategorie(null)}
            className="flex min-h-11 cursor-pointer items-center gap-1 justify-self-start border-0 bg-transparent px-1 text-sm font-semibold text-accent-700"
          >
            <CaretLeftIcon aria-hidden="true" /> Équiper
          </button>
          <h3 className="m-0 px-1 text-base font-bold">{LIBELLES_CATEGORIE[categorie]}</h3>
          <p className="m-0 px-1 text-[13px] leading-5 text-neutre-800">
            Choisissez un élément puis cliquez sur le plan. Près d’un mur, il s’y colle, dos au mur.
          </p>
          {categorie === 'cuisine' ? <CouleursCuisineMenu etat={etat} dispatch={dispatch} /> : null}
          <CartesObjets
            objets={CATALOGUE_OBJETS.filter((o) => o.categorie === categorie)}
            choisi={choisi}
            choisir={choisir}
          />
          {categorie === 'cuisine' && triangle ? (
            <p role="status" className="m-0 rounded-[10px] bg-neutre-100 p-3 text-sm leading-5">
              Triangle d’activité : {formatLongueur(triangle.perimetre)}.{' '}
              {CONSEILS[triangle.conseil]}
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {CATEGORIES_OBJETS.map((c) => {
            const objets = CATALOGUE_OBJETS.filter((o) => o.categorie === c);
            const vitrine = objets.find((o) => o.id === VITRINE[c]) ?? objets[0];
            return (
              <Ligne
                key={c}
                titre={LIBELLES_CATEGORIE[c]}
                detail={`${objets.length} élément${objets.length > 1 ? 's' : ''}`}
                apercu={vitrine ? <MiniatureObjet o={vitrine} taille={48} /> : undefined}
                onClick={() => setCategorie(c)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
