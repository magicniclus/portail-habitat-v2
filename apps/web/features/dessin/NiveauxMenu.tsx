'use client';

import { formatLongueur, niveauxTries, type TypeNiveau } from '@ph/core/dessin';
import {
  ArrowDownIcon,
  ArrowLineDownIcon,
  ArrowLineUpIcon,
  ArrowUpIcon,
  HouseSimpleIcon,
  TrashIcon,
  type Icon,
} from '@phosphor-icons/react';
import { Checkbox, IconButton } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import { ChampMesure } from './ChampMesure';
import { niveauDe, sceneDe, type Action, type EtatEditeur } from './etat';

const AJOUTS: { type: TypeNiveau; libelle: string; aria: string; Icone: Icon }[] = [
  { type: 'etage', libelle: 'Étage', aria: 'Ajouter un étage', Icone: ArrowLineUpIcon },
  { type: 'combles', libelle: 'Combles', aria: 'Ajouter des combles', Icone: HouseSimpleIcon },
  { type: 'sous_sol', libelle: 'Sous-sol', aria: 'Ajouter un sous-sol', Icone: ArrowLineDownIcon },
];

/** Altitude d'un plancher, signée comme sur une coupe (+2,70 m, −2,50 m). */
const altitude = (mm: number) =>
  `${mm > 0 ? '+' : mm < 0 ? '−' : '±'}${formatLongueur(Math.abs(mm))}`;

const titre = 'm-0 px-1 text-[13px] font-bold tracking-wide text-neutre-700 uppercase';

/**
 * Niveaux (DES-04, DES-05), présentés comme une coupe du bâtiment : niveaux empilés du plus
 * haut au plus bas avec l'altitude de leur plancher ; le niveau affiché est mis en avant.
 * Réglages du niveau affiché, puis ajout d'un niveau.
 */
export function NiveauxMenu({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const [copier, setCopier] = useState(true);
  const niveaux = [...niveauxTries(sceneDe(etat))].reverse();
  const actuel = niveauDe(etat);
  const regler = (reglages: { hauteurSousPlafond?: number; epaisseurPlancher?: number }) =>
    dispatch({ type: 'reglerNiveau', niveauId: actuel.id, reglages });
  return (
    <div className="grid gap-5">
      <section aria-label="Niveaux de la maison" className="grid gap-2">
        <p className={titre}>Coupe de la maison</p>
        <ol className="m-0 grid list-none gap-1.5 p-0">
          {niveaux.map((n, i) => {
            const courant = n.id === etat.niveauId;
            return (
              <li
                key={n.id}
                className={`grid grid-cols-[4.5rem_minmax(0,1fr)] overflow-hidden rounded-xl border transition-colors ${courant ? 'border-accent bg-accent-100' : 'border-neutre-200 bg-blanc hover:bg-neutre-100'}`}
              >
                {/* Altitude du plancher, comme le repère de niveau d'une coupe. */}
                <button
                  type="button"
                  aria-label={`Afficher le niveau ${n.nom}`}
                  onClick={() => dispatch({ type: 'changerNiveau', niveauId: n.id })}
                  className={`grid cursor-pointer place-content-center gap-0.5 border-0 border-r px-1 text-center font-[inherit] ${courant ? 'border-accent-300 bg-accent text-blanc' : 'border-neutre-200 bg-neutre-100 text-neutre-800'}`}
                >
                  <span aria-hidden="true" className="text-[11px] leading-none">
                    ▽
                  </span>
                  <span className="text-[13px] font-bold tabular-nums">{altitude(n.altitude)}</span>
                </button>
                <div className="grid min-w-0 gap-0.5 p-1.5">
                  <input
                    size={1}
                    aria-label={`Nom du niveau ${n.nom}`}
                    defaultValue={n.nom}
                    maxLength={40}
                    onFocus={() => !courant && dispatch({ type: 'changerNiveau', niveauId: n.id })}
                    onBlur={(ev) => {
                      const nom = ev.target.value.trim();
                      if (nom && nom !== n.nom)
                        dispatch({ type: 'renommerNiveau', niveauId: n.id, nom });
                    }}
                    className="min-h-11 w-full rounded-lg border border-transparent bg-transparent px-2 text-base font-semibold hover:border-neutre-300 focus:border-accent"
                  />
                  <div className="flex items-center justify-end">
                    <span className="flex">
                      <IconButton
                        aria-label={`Monter le niveau ${n.nom}`}
                        icone={<ArrowUpIcon />}
                        disabled={i === 0}
                        onClick={() =>
                          dispatch({ type: 'deplacerNiveau', niveauId: n.id, sens: 1 })
                        }
                      />
                      <IconButton
                        aria-label={`Descendre le niveau ${n.nom}`}
                        icone={<ArrowDownIcon />}
                        disabled={i === niveaux.length - 1}
                        onClick={() =>
                          dispatch({ type: 'deplacerNiveau', niveauId: n.id, sens: -1 })
                        }
                      />
                      <IconButton
                        aria-label={`Supprimer le niveau ${n.nom}`}
                        icone={<TrashIcon />}
                        disabled={niveaux.length === 1}
                        onClick={() => {
                          if (window.confirm(`Supprimer « ${n.nom} » et tout ce qu’il contient ?`))
                            dispatch({ type: 'supprimerNiveau', niveauId: n.id });
                        }}
                      />
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label={`Réglages du niveau ${actuel.nom}`} className="grid gap-2.5">
        <p className={titre}>{actuel.nom}</p>
        <ChampMesure
          label="Hauteur sous plafond (cm)"
          mm={actuel.hauteurSousPlafond}
          min={1_800}
          appliquer={(mm) => regler({ hauteurSousPlafond: mm })}
        />
        <ChampMesure
          label="Épaisseur du plancher (cm)"
          mm={actuel.epaisseurPlancher}
          appliquer={(mm) => regler({ epaisseurPlancher: mm })}
        />
      </section>

      <section aria-label="Ajouter un niveau" className="grid gap-2.5">
        <p className={titre}>Ajouter un niveau</p>
        <div className="grid grid-cols-3 gap-2">
          {AJOUTS.map(({ type, libelle, aria, Icone }) => (
            <button
              key={type}
              type="button"
              aria-label={aria}
              onClick={() => dispatch({ type: 'ajouterNiveau', niveau: type, copierMurs: copier })}
              className="grid min-h-16 cursor-pointer justify-items-center gap-1 rounded-xl border-2 border-neutre-200 bg-blanc p-2 text-[13px] font-semibold font-[inherit] text-texte transition-colors hover:border-accent-300 hover:bg-accent-100"
            >
              <Icone size={22} aria-hidden="true" className="text-accent-700" />
              {libelle}
            </button>
          ))}
        </div>
        <Checkbox checked={copier} onChange={(ev) => setCopier(ev.target.checked)}>
          Reprendre les murs extérieurs
        </Checkbox>
      </section>
    </div>
  );
}
