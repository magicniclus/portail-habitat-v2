'use client';

import { recapPaiement } from '@ph/core/facturation';
import { formatEuros } from '@ph/core/format';
import { CONTENU_OFFRES, NOMS_FORMULE, type FormulePayante } from '@ph/core/paiements';
import { bouton, Button, cn } from '@ph/ui';
import {
  ArrowRightIcon,
  ChartLineUpIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  CrownSimpleIcon,
  NewspaperClippingIcon,
  SparkleIcon,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { FenetreOffre } from './FenetreOffre';

/** Icônes proposées (un nom : l'encart peut être posé depuis une page serveur). */
const ICONES = {
  ia: SparkleIcon,
  statistiques: ChartLineUpIcon,
  blog: NewspaperClippingIcon,
  formulaire: ChatCircleTextIcon,
} as const;

/**
 * Encart d'une fonction payante (PAIEMENTS §4), avec du caractère : icône, badge de l'offre, ce
 * que l'artisan y gagne, 3 avantages cochés (sauf en `compact`), prix mensuel HT et bouton fort.
 * Le bouton ouvre toujours la fenêtre d'offre, jamais d'activation directe.
 */
export function EncartPremium({
  formule,
  titre,
  children,
  cta,
  raison,
  icone = 'ia',
  compact = false,
  onPlusTard,
  className,
}: {
  formule: FormulePayante;
  titre: string;
  /** Ce que la fonction apporte, en une ou deux phrases. */
  children: ReactNode;
  cta: string;
  /** Phrase en tête de la fenêtre d'offre. */
  raison: string;
  icone?: keyof typeof ICONES;
  /** Panneaux étroits (éditeur) : sans liste d'avantages. */
  compact?: boolean;
  onPlusTard?: () => void;
  className?: string;
}) {
  const I = ICONES[icone];
  const r = recapPaiement(formule);
  const avantages = CONTENU_OFFRES[formule].avantages.slice(0, 3);
  return (
    <section
      className={cn(
        'relative isolate grid gap-3 overflow-hidden rounded-[18px] border border-accent-200 bg-blanc shadow-[0_14px_36px_-20px_var(--accent)]',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
    >
      {/* Halos de couleur : la carte se détache de l'écran sans image. */}
      <span
        aria-hidden="true"
        className="absolute -top-20 -right-16 -z-10 size-56 rounded-full bg-accent-100"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-24 -left-12 -z-10 size-44 rounded-full bg-accent-100 opacity-60"
      />
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className={cn(
            'grid flex-none place-items-center rounded-[14px] bg-accent text-blanc shadow-[0_8px_18px_-8px_var(--accent)]',
            compact ? 'size-10' : 'size-12',
          )}
        >
          <I size={compact ? 20 : 24} weight="fill" />
        </span>
        <div className="grid min-w-0 gap-1.5">
          <span className="inline-flex w-fit items-center gap-1 rounded-pill bg-accent-100 px-2.5 py-0.5 text-xs font-bold tracking-wide text-accent-800 uppercase">
            <CrownSimpleIcon size={13} weight="fill" aria-hidden="true" />
            {NOMS_FORMULE[formule]}
          </span>
          <h3 className={cn('m-0 leading-tight font-bold', compact ? 'text-base' : 'text-lg')}>
            {titre}
          </h3>
          <div className="text-[15px] leading-[22px] text-neutre-800">{children}</div>
        </div>
      </div>
      {compact ? null : (
        <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-3">
          {avantages.map((a) => (
            <li key={a} className="flex items-start gap-1.5 text-sm font-semibold text-neutre-800">
              <CheckCircleIcon
                size={18}
                weight="fill"
                aria-hidden="true"
                className="mt-px flex-none text-accent"
              />
              {a}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <FenetreOffre formule={formule} raison={raison} className={bouton({ taille: 'md' })}>
          {cta}
          <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
        </FenetreOffre>
        <span className="text-sm text-neutre-700">
          <strong className="text-texte">
            {formatEuros(r.montantHt, { decimales: 'toujours' })} HT
          </strong>{' '}
          / mois · sans engagement
        </span>
        {onPlusTard ? (
          <Button variant="fantome" taille="sm" onClick={onPlusTard} className="ml-auto">
            Plus tard
          </Button>
        ) : null}
      </div>
    </section>
  );
}
