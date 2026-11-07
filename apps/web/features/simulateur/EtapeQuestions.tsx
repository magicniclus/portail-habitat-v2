'use client';

import { Button, Field, Input, Select } from '@ph/ui';
import { useRef, useState } from 'react';
import { ChampQuestion } from './ChampQuestion';
import { Recapitulatif } from './Recapitulatif';
import {
  LIBELLES_ACCES,
  type Acces,
  type Chantier,
  type PrestationSimulateur,
  type Reponses,
} from './types';

const TITRES: Record<number, string> = {
  2: 'Votre projet en détail',
  3: 'Options et finitions',
  4: 'Localisation du chantier',
};
const SOUS_TITRES: Record<number, string> = {
  2: 'Ces éléments pèsent le plus lourd dans le prix. Ajustez-les au plus juste, vous pourrez les modifier ensuite.',
  3: "Tout est facultatif : chaque option est chiffrée séparément dans l'estimation.",
  4: "Les prix de la main-d'œuvre varient fortement d'un département à l'autre.",
};

/** Étapes 2 à 4 : questions de la prestation puis chantier. Aucun montant (COMPTES §6.1). */
export function EtapeQuestions({
  etape,
  prestation: p,
  reponses,
  chantier,
  onReponse,
  onChantier,
  onSuivant,
  onPrecedent,
  onChanger,
}: {
  etape: 2 | 3 | 4;
  prestation: PrestationSimulateur;
  reponses: Reponses;
  chantier: Chantier;
  onReponse: (id: string, v: Reponses[string]) => void;
  onChantier: (c: Chantier) => void;
  onSuivant: () => void;
  onPrecedent: () => void;
  onChanger: () => void;
}) {
  const [erreurCp, setErreurCp] = useState<string | null>(null);
  const champCp = useRef<HTMLInputElement>(null);
  const suivant = () => {
    if (etape === 4 && !/^\d{5}$/.test(chantier.codePostal)) {
      setErreurCp('Renseignez un code postal à 5 chiffres.');
      champCp.current?.focus();
      return;
    }
    onSuivant();
  };
  const reste = 5 - etape;

  return (
    <div className="grid items-start gap-x-[clamp(22px,3vw,40px)] gap-y-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.85fr)]">
      <div className="rounded-[18px] bg-blanc p-[clamp(20px,3vw,32px)] shadow-md">
        <button
          type="button"
          onClick={onPrecedent}
          className="mb-3.5 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[14.5px] font-semibold text-accent-700"
        >
          ← Retour
        </button>
        <h1 className="m-0 mb-2 text-[clamp(23px,2.7vw,31px)] leading-[1.14]">{TITRES[etape]}</h1>
        <p className="m-0 mb-6 max-w-[56ch] text-[15.5px] leading-[25px] text-neutre-800">
          {SOUS_TITRES[etape]}
        </p>
        <div className="grid gap-[26px]">
          {p.champs
            .filter((c) => c.e === etape)
            .map((c) => (
              <ChampQuestion
                key={c.id}
                champ={c}
                valeur={reponses[c.id]}
                onChange={(v) => onReponse(c.id, v)}
              />
            ))}
          {etape === 4 ? (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Code postal du chantier" requis erreur={erreurCp}>
                <Input
                  ref={champCp}
                  champ="codePostal"
                  placeholder="33000"
                  value={chantier.codePostal}
                  onChange={(e) => {
                    setErreurCp(null);
                    onChantier({
                      ...chantier,
                      codePostal: e.target.value.replace(/\D/g, '').slice(0, 5),
                    });
                  }}
                  className="min-h-12"
                />
              </Field>
              <Field label="Accès au logement">
                <Select
                  value={chantier.acces}
                  onChange={(e) => onChantier({ ...chantier, acces: e.target.value as Acces })}
                  className="min-h-12"
                >
                  {Object.entries(LIBELLES_ACCES).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-trait pt-5">
          <Button taille="lg" onClick={suivant}>
            {etape === 4 ? 'Dernière étape' : 'Continuer'}
          </Button>
          <Button variant="fantome" taille="lg" onClick={onPrecedent}>
            Retour
          </Button>
          <span className="text-[13.5px] text-neutre-700 sm:ml-auto">
            Vos réponses sont modifiables à tout moment.
          </span>
        </div>
      </div>
      <aside className="grid gap-3.5 lg:sticky lg:top-24">
        <div className="rounded-[16px] bg-blanc p-5 shadow-sm">
          <p className="m-0 mb-1 text-[12.5px] tracking-[0.07em] text-accent-700 uppercase">
            Votre estimation
          </p>
          <p className="m-0 mb-2.5 text-[19px] leading-tight font-bold">
            {reste === 1 ? "Plus qu'une étape" : `Plus que ${reste} étapes`}
          </p>
          <div aria-hidden="true" className="mb-2.5 h-1.5 rounded-pill bg-accent-200">
            <span
              className="block h-full rounded-pill bg-accent"
              style={{ width: `${((etape - 1) / 4) * 100}%` }}
            />
          </div>
          <p className="m-0 text-[13.5px] leading-[21px] text-neutre-800">
            Chiffrée poste par poste avec les prix constatés dans votre département, puis envoyée
            par email.
          </p>
        </div>
        <Recapitulatif prestation={p} reponses={reponses} jusqua={etape} onChanger={onChanger} />
      </aside>
    </div>
  );
}
