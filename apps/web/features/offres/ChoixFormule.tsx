'use client';

import { formatEuros } from '@ph/core/format';
import {
  CONTENU_OFFRES,
  NOMS_FORMULE,
  PRIX_FORMULES_HT,
  type FormulePayante,
} from '@ph/core/paiements';
import { cn } from '@ph/ui';
import { CrownSimpleIcon } from '@phosphor-icons/react';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });
const COMPLETE: FormulePayante = 'tout_inclus';

/**
 * Choix avant Stripe (fenêtre d'offre) : la formule demandée, cochée par défaut, et l'offre
 * complète « Tout inclus » mise en avant avec la différence de prix. Rien n'est pré-coché à la
 * place de l'artisan.
 */
export function ChoixFormule({
  demandee,
  valeur,
  onChange,
}: {
  demandee: FormulePayante;
  valeur: FormulePayante;
  onChange: (f: FormulePayante) => void;
}) {
  if (demandee === COMPLETE) return null;
  const ecart = PRIX_FORMULES_HT[COMPLETE] - PRIX_FORMULES_HT[demandee];
  const options: { f: FormulePayante; titre: string; detail: string }[] = [
    {
      f: demandee,
      titre: NOMS_FORMULE[demandee],
      detail: `${eur(PRIX_FORMULES_HT[demandee])} HT / mois`,
    },
    {
      f: COMPLETE,
      titre: NOMS_FORMULE[COMPLETE],
      detail: `${eur(PRIX_FORMULES_HT[COMPLETE])} HT / mois · seulement ${eur(ecart)} de plus`,
    },
  ];
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-[15px] font-bold">Votre formule</legend>
      {options.map(({ f, titre, detail }) => {
        const complete = f === COMPLETE;
        const choisie = valeur === f;
        return (
          <label
            key={f}
            className={cn(
              'relative grid min-h-11 cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-card border p-3.5 has-focus-visible:outline-2 has-focus-visible:outline-accent',
              choisie ? 'border-2 border-accent bg-accent-100' : 'border-trait bg-blanc',
            )}
          >
            <input
              type="radio"
              name="formule-offre"
              checked={choisie}
              onChange={() => onChange(f)}
              className="mt-1 size-5 accent-accent-action"
            />
            <span className="grid gap-0.5">
              <span className="flex flex-wrap items-center gap-2 font-bold">
                {titre}
                {complete ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-premium bg-premium-fond px-2 py-0.5 text-xs text-premium-texte">
                    <CrownSimpleIcon size={12} weight="fill" aria-hidden="true" />
                    Recommandé
                  </span>
                ) : null}
              </span>
              <span className="text-sm text-neutre-800">{detail}</span>
              {complete ? (
                <span className="text-sm text-neutre-700">{CONTENU_OFFRES[COMPLETE].accroche}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
