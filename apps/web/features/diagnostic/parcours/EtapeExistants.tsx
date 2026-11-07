'use client';

import { Button, Checkbox, Field, Select } from '@ph/ui';
import type { Bien } from './types';

export type Existants = Record<string, { actif: boolean; annee: number }>;

const ANNEES = Array.from({ length: 15 }, (_, i) => 2026 - i);

const CHOIX = [
  {
    cle: 'gaz',
    label: 'Installation de gaz',
    options: [
      ['oui', 'Oui, chaudière ou cuisinière gaz'],
      ['non', 'Pas de gaz'],
    ],
  },
  {
    cle: 'elec',
    label: 'Installation électrique',
    options: [
      ['ancienne', 'Plus de 15 ans'],
      ['recente', 'Refaite il y a moins de 15 ans'],
    ],
  },
  {
    cle: 'assainissement',
    label: 'Assainissement',
    options: [
      ['collectif', 'Raccordé au tout-à-l’égout'],
      ['individuel', 'Fosse / assainissement individuel'],
      ['inconnu', 'Je ne sais pas'],
    ],
  },
  {
    cle: 'classe',
    label: 'Classe DPE connue',
    options: [
      ['inconnu', 'Je ne sais pas'],
      ['AB', 'A ou B'],
      ['CD', 'C ou D'],
      ['E', 'E'],
      ['FG', 'F ou G'],
    ],
  },
] as const;

/** Étape 2 : équipements et rapports déjà en votre possession (déduits du devis s'ils sont valables). */
export function EtapeExistants({
  bien,
  obligatoires,
  existants,
  onBien,
  onExistants,
  onSuivant,
  onPrecedent,
}: {
  bien: Bien;
  /** Diagnostics obligatoires pour ce bien : ceux dont un rapport peut être réutilisé. */
  obligatoires: { diagId: string; nom: string }[];
  existants: Existants;
  onBien: (b: Bien) => void;
  onExistants: (e: Existants) => void;
  onSuivant: () => void;
  onPrecedent: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSuivant();
      }}
      className="grid gap-6 rounded-[18px] bg-blanc p-[clamp(20px,3vw,32px)] shadow-md"
    >
      <div>
        <button
          type="button"
          onClick={onPrecedent}
          className="mb-3 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[14.5px] font-semibold text-accent-700"
        >
          ← Retour
        </button>
        <h1 className="m-0 mb-2 text-[clamp(24px,2.8vw,32px)] leading-[1.12]">
          Équipements et rapports existants
        </h1>
        <p className="m-0 max-w-[56ch] text-[15.5px] leading-6 text-neutre-800">
          On ne refait que ce qui est obligatoire et périmé. Renseignez ce que vous avez déjà :
          chaque rapport encore valable est déduit du devis.
        </p>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        {CHOIX.map((c) => (
          <Field key={c.cle} label={c.label}>
            <Select
              value={bien[c.cle]}
              onChange={(e) => onBien({ ...bien, [c.cle]: e.target.value })}
              className="min-h-12"
            >
              {c.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-1 text-[16.5px] font-bold">
          Diagnostics déjà en votre possession
          <span className="block text-sm font-normal text-neutre-800">
            Cochez, puis indiquez l&apos;année du rapport.
          </span>
        </legend>
        {obligatoires.map((d) => {
          const x = existants[d.diagId] ?? { actif: false, annee: 2024 };
          return (
            <div
              key={d.diagId}
              className="flex flex-wrap items-center gap-x-3 rounded-[11px] border border-neutre-300 px-3.5 has-checked:border-accent-300 has-checked:bg-accent-100"
            >
              <Checkbox
                checked={x.actif}
                onChange={(e) =>
                  onExistants({ ...existants, [d.diagId]: { ...x, actif: e.target.checked } })
                }
                className="flex-[1_1_200px] font-semibold"
              >
                {d.nom}
              </Checkbox>
              {x.actif ? (
                <label className="flex items-center gap-2 text-[13.5px] text-neutre-800">
                  réalisé en
                  <select
                    value={x.annee}
                    aria-label={`Année du rapport : ${d.nom}`}
                    onChange={(e) =>
                      onExistants({
                        ...existants,
                        [d.diagId]: { actif: true, annee: Number(e.target.value) },
                      })
                    }
                    className="min-h-11 rounded-control border border-neutre-400 bg-blanc px-2 text-base"
                  >
                    {ANNEES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap gap-3 border-t border-trait pt-5">
        <Button type="submit" taille="lg">
          Voir mon dossier
        </Button>
        <Button variant="fantome" taille="lg" onClick={onPrecedent}>
          Retour
        </Button>
      </div>
    </form>
  );
}
