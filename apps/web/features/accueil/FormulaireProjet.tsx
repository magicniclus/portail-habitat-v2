'use client';

import { bouton, Field, Input, Select } from '@ph/ui';
import { useState } from 'react';
import { DELAIS, PROJETS_POPULAIRES } from './choix';

/**
 * Formulaire du hero (maquette Accueil) : envoi GET natif vers le simulateur (ACC-03), sans JavaScript
 * à l'envoi. Les chips « Projets populaires » remplissent le champ et fixent la prestation (ACC-02).
 * `cible` vient du serveur : le module des routes reste hors du JavaScript du navigateur (D46).
 * La recherche avec suggestions arrive au lot 7 ; un texte libre part en `?projet=` au simulateur (lot 8).
 */
export function FormulaireProjet({ cible }: { cible: string }) {
  const [projet, setProjet] = useState('');
  const [prestation, setPrestation] = useState('');

  return (
    <>
      <form
        action={cible}
        method="get"
        className="grid gap-3 rounded-[16px] bg-blanc p-4 shadow-md sm:p-5"
        aria-label="Décrire mon projet"
      >
        {prestation ? <input type="hidden" name="prestation" value={prestation} /> : null}
        <Field label="Quel est votre projet ?">
          <Input
            name={prestation ? undefined : 'projet'}
            autoComplete="off"
            enterKeyHint="next"
            maxLength={120}
            placeholder="Ex. Rénovation salle de bain, douche italienne, pompe à chaleur…"
            value={projet}
            onChange={(e) => {
              setProjet(e.target.value);
              setPrestation('');
            }}
            className="min-h-12"
          />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
          <Field label="Code postal">
            <Input
              champ="codePostal"
              name="cp"
              placeholder="33000"
              enterKeyHint="next"
              className="min-h-12"
            />
          </Field>
          <Field label="Démarrage souhaité">
            <Select name="delai" defaultValue="asap" className="min-h-12">
              {DELAIS.map((d) => (
                <option key={d.valeur} value={d.valeur}>
                  {d.libelle}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {/* Bouton natif : le composant Button embarque Radix Slot, inutile ici (budget D46). */}
        <button
          type="submit"
          className={bouton({ taille: 'lg', pleineLargeur: true, className: 'min-h-[52px]' })}
        >
          Lancer mon estimation gratuite
        </button>
      </form>

      <div className="mt-[18px] flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-neutre-800" id="projets-populaires">
          Projets populaires :
        </span>
        <ul aria-labelledby="projets-populaires" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {PROJETS_POPULAIRES.map((p) => (
            <li key={p.prestation}>
              <button
                type="button"
                aria-pressed={prestation === p.prestation}
                onClick={() => {
                  setProjet(p.libelle);
                  setPrestation(p.prestation);
                }}
                className="min-h-11 cursor-pointer rounded-pill border border-accent-200 bg-blanc px-[15px] text-sm font-semibold text-accent-700 hover:border-accent hover:bg-accent-200 aria-pressed:border-accent aria-pressed:bg-accent-200"
              >
                {p.libelle}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
