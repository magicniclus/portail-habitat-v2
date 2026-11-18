'use client';

import { formatLongueur, niveauxTries, type TypeNiveau } from '@ph/core/dessin';
import { TrashIcon } from '@phosphor-icons/react';
import { Button, Checkbox, IconButton } from '@ph/ui';
import { useState, type Dispatch } from 'react';
import { sceneDe, type Action, type EtatEditeur } from './etat';

const AJOUTS: { type: TypeNiveau; libelle: string }[] = [
  { type: 'etage', libelle: 'Étage' },
  { type: 'combles', libelle: 'Combles' },
  { type: 'sous_sol', libelle: 'Sous-sol' },
];

/** Niveaux (DES-04, DES-05) : choisir, renommer, supprimer, ajouter (murs extérieurs repris). */
export function NiveauxMenu({ etat, dispatch }: { etat: EtatEditeur; dispatch: Dispatch<Action> }) {
  const [copier, setCopier] = useState(true);
  const niveaux = [...niveauxTries(sceneDe(etat))].reverse();
  return (
    <div className="grid gap-4">
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {niveaux.map((n) => {
          const courant = n.id === etat.niveauId;
          return (
            <li
              key={n.id}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-[10px] border p-1.5 ${courant ? 'border-accent-300 bg-accent-100' : 'border-trait'}`}
            >
              <div className="min-w-0">
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
                <span className="block px-2 text-xs text-neutre-700">
                  Plancher à {formatLongueur(n.altitude)}
                </span>
              </div>
              <div className="flex items-center">
                {courant ? null : (
                  <Button
                    taille="sm"
                    variant="secondaire"
                    onClick={() => dispatch({ type: 'changerNiveau', niveauId: n.id })}
                  >
                    Voir
                  </Button>
                )}
                <IconButton
                  aria-label={`Supprimer le niveau ${n.nom}`}
                  icone={<TrashIcon />}
                  disabled={niveaux.length === 1}
                  onClick={() => {
                    if (window.confirm(`Supprimer « ${n.nom} » et tout ce qu’il contient ?`))
                      dispatch({ type: 'supprimerNiveau', niveauId: n.id });
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-2.5 rounded-[10px] bg-neutre-100 p-3">
        <p className="m-0 text-sm font-bold">Ajouter un niveau</p>
        <Checkbox checked={copier} onChange={(ev) => setCopier(ev.target.checked)}>
          Reprendre les murs extérieurs
        </Checkbox>
        <div className="flex flex-wrap gap-2">
          {AJOUTS.map((a) => (
            <Button
              key={a.type}
              taille="sm"
              variant="secondaire"
              onClick={() =>
                dispatch({ type: 'ajouterNiveau', niveau: a.type, copierMurs: copier })
              }
            >
              + {a.libelle}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
