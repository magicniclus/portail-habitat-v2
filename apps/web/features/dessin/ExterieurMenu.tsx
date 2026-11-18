'use client';

import { LIBELLES_FORME_PISCINE, type FormePiscine, type TypeCloture } from '@ph/core/dessin';
import { Button, Select } from '@ph/ui';
import { TrashIcon } from '@phosphor-icons/react';
import type { Dispatch } from 'react';
import { niveauDe, sceneDe, type Action, type ElementExterieur, type EtatEditeur } from './etat';

const OUTILS: { el: ElementExterieur; libelle: string; aide: string }[] = [
  { el: 'terrasse', libelle: 'Terrasse', aide: 'Deux coins opposés' },
  { el: 'piscine', libelle: 'Piscine', aide: 'Un clic au centre' },
  { el: 'allee', libelle: 'Allée', aide: 'Deux coins opposés' },
  { el: 'cloture', libelle: 'Clôture', aide: 'Point par point, Échap pour finir' },
  { el: 'arbre', libelle: 'Arbre', aide: 'Un clic, taille adulte' },
  { el: 'arbuste', libelle: 'Arbuste', aide: 'Un clic' },
  { el: 'haie', libelle: 'Haie', aide: 'Un clic par pied' },
  { el: 'parcelle', libelle: 'Parcelle', aide: 'Deux coins opposés' },
];
const CLOTURES: [TypeCloture, string][] = [
  ['bois', 'Bois'],
  ['grillage', 'Grillage'],
  ['muret', 'Muret'],
  ['haie', 'Haie'],
  ['portail', 'Portail'],
];

/** Extérieur (DES-18 à DES-20) : terrasses, piscines, allées, clôtures, végétaux, parcelle. */
export function ExterieurMenu({
  etat,
  dispatch,
}: {
  etat: EtatEditeur;
  dispatch: Dispatch<Action>;
}) {
  const n = niveauDe(etat);
  const choisir = (el: ElementExterieur) =>
    dispatch({ type: 'outil', outil: 'exterieur', elementExterieur: el });
  return (
    <div className="grid gap-4">
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
        {OUTILS.map((o) => {
          const actif = etat.outil === 'exterieur' && etat.elementExterieur === o.el;
          return (
            <li key={o.el}>
              <button
                type="button"
                aria-pressed={actif}
                onClick={() => choisir(o.el)}
                className={`grid min-h-14 w-full cursor-pointer gap-0.5 rounded-[10px] border px-2.5 py-2 text-left font-[inherit] ${actif ? 'border-accent bg-accent-100' : 'border-neutre-300 bg-blanc'}`}
              >
                <span className="text-sm font-semibold text-texte">{o.libelle}</span>
                <span className="text-xs text-neutre-800">{o.aide}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="grid gap-1 text-[13px] font-semibold">
          Forme de piscine
          <Select
            value={etat.formePiscine}
            onChange={(ev) =>
              dispatch({
                type: 'outil',
                outil: 'exterieur',
                elementExterieur: 'piscine',
                formePiscine: ev.target.value as FormePiscine,
              })
            }
          >
            {(Object.keys(LIBELLES_FORME_PISCINE) as FormePiscine[]).map((f) => (
              <option key={f} value={f}>
                {LIBELLES_FORME_PISCINE[f]}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-[13px] font-semibold">
          Type de clôture
          <Select
            value={etat.typeCloture}
            onChange={(ev) =>
              dispatch({
                type: 'outil',
                outil: 'exterieur',
                elementExterieur: 'cloture',
                typeCloture: ev.target.value as TypeCloture,
              })
            }
          >
            {CLOTURES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <Button variant="secondaire" onClick={() => dispatch({ type: 'parcelleAutour' })}>
        {sceneDe(etat).terrain
          ? 'Recaler la parcelle autour de la maison'
          : 'Parcelle autour de la maison'}
      </Button>
      {n.exterieur.allees.length ? (
        <ul className="m-0 grid list-none gap-1 p-0">
          {n.exterieur.allees.map((_, i) => (
            <li key={i} className="flex items-center justify-between px-1 text-sm">
              Allée {i + 1}
              <button
                type="button"
                aria-label={`Retirer l’allée ${i + 1}`}
                className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent hover:bg-neutre-100"
                onClick={() =>
                  dispatch({ type: 'supprimerExterieur', genre: 'allee', id: String(i) })
                }
              >
                <TrashIcon aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="m-0 px-1 text-[13px] leading-5 text-neutre-800">
        Cliquez ensuite sur une terrasse, une piscine, une clôture ou un végétal pour le régler.
        Distances aux limites indicatives, ce n’est pas un avis d’urbanisme.
      </p>
    </div>
  );
}
