'use client';

import { Button, Field, Input, Select } from '@ph/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cibleProjet } from './cible';
import { DELAIS, PROJETS_POPULAIRES } from './contenu';

/**
 * Formulaire du hero (maquette Accueil). La recherche avec suggestions arrive au lot 7 (ACC-02b) ;
 * ici, les chips « Projets populaires » remplissent le champ (ACC-02) et fixent la prestation (ACC-03).
 */
export function FormulaireProjet() {
  const router = useRouter();
  const [projet, setProjet] = useState('');
  const [prestation, setPrestation] = useState<string | undefined>();

  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    router.push(
      cibleProjet({
        projet,
        prestation,
        cp: String(f.get('cp') ?? ''),
        delai: String(f.get('delai') ?? ''),
      }) as Route,
    );
  };

  return (
    <>
      <form
        onSubmit={envoyer}
        className="grid gap-3 rounded-[16px] bg-blanc p-4 shadow-md sm:p-5"
        aria-label="Décrire mon projet"
      >
        <Field label="Quel est votre projet ?">
          <Input
            name="projet"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="Ex. Rénovation salle de bain, douche italienne, pompe à chaleur…"
            value={projet}
            onChange={(e) => {
              setProjet(e.target.value);
              setPrestation(undefined);
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
        <Button type="submit" taille="lg" pleineLargeur className="min-h-[52px]">
          Lancer mon estimation gratuite
        </Button>
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
