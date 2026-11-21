'use client';

import { formatEuros } from '@ph/core/format';
import {
  CONTENU_OFFRES,
  NOMS_FORMULE,
  PRIX_FORMULES_HT,
  type FormulePayante,
} from '@ph/core/paiements';
import { cn } from '@ph/ui';
import { CheckCircleIcon, CrownSimpleIcon } from '@phosphor-icons/react';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });
const OFFRE_COMPLETE: FormulePayante = 'tout_inclus';

/** L'offre complète est proposée à côté de la formule demandée (sauf si c'est elle). */
export const avecOffreComplete = (f: FormulePayante) => f !== OFFRE_COMPLETE;

/**
 * Choix avant Stripe (fenêtre d'offre, fenêtre de paiement) : la formule demandée et l'offre
 * complète « Tout inclus », côte à côte, chacune avec ses avantages en colonne. Aucune n'est
 * cochée d'avance : l'artisan choisit, puis le récapitulatif et le paiement suivent.
 */
export function ChoixFormule({
  demandee,
  valeur,
  onChange,
}: {
  demandee: FormulePayante;
  valeur: FormulePayante | null;
  onChange: (f: FormulePayante) => void;
}) {
  if (!avecOffreComplete(demandee)) return null;
  const ecart = PRIX_FORMULES_HT[OFFRE_COMPLETE] - PRIX_FORMULES_HT[demandee];
  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
      <legend className="mb-3 p-0 text-[15px] font-bold">Choisissez votre formule</legend>
      {[demandee, OFFRE_COMPLETE].map((f) => {
        const complete = f === OFFRE_COMPLETE;
        const choisie = valeur === f;
        const c = CONTENU_OFFRES[f];
        return (
          <label
            key={f}
            className={cn(
              'relative flex cursor-pointer flex-col gap-3 rounded-card border-2 p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
              choisie
                ? 'border-accent bg-accent-100'
                : complete
                  ? 'border-premium bg-blanc'
                  : 'border-trait bg-blanc',
            )}
          >
            {complete ? (
              <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full border border-premium bg-premium-fond px-2.5 py-0.5 text-xs font-bold text-premium-texte">
                <CrownSimpleIcon size={12} weight="fill" aria-hidden="true" />
                Recommandé
              </span>
            ) : null}
            <span className="flex items-start gap-2.5">
              <input
                type="radio"
                name="formule-offre"
                checked={choisie}
                onChange={() => onChange(f)}
                className="mt-1 size-5 flex-none accent-accent-action"
              />
              <span className="grid gap-0.5">
                <strong className="text-[17px]">{NOMS_FORMULE[f]}</strong>
                <span className="text-sm text-neutre-800">{c.promesse}</span>
              </span>
            </span>
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <strong className="text-2xl text-accent-800">{eur(PRIX_FORMULES_HT[f])}</strong>
              <span className="text-sm text-neutre-800">HT / mois</span>
              {complete ? (
                <span className="basis-full text-sm font-semibold text-premium-texte">
                  seulement {eur(ecart)} de plus par mois
                </span>
              ) : null}
            </span>
            <ul className="m-0 grid list-none gap-2 p-0 text-sm leading-[20px]">
              {c.avantages.map((a) => (
                <li key={a} className="flex gap-2">
                  <CheckCircleIcon
                    size={18}
                    weight="fill"
                    aria-hidden="true"
                    className="mt-px flex-none text-accent-action"
                  />
                  {a}
                </li>
              ))}
            </ul>
          </label>
        );
      })}
    </fieldset>
  );
}
