'use client';

import type { ResultatMentions, Totaux } from '@ph/core/devis';
import { formatEuros } from '@ph/core/format';
import { cn } from '@ph/ui';
import { CaretDownIcon } from '@phosphor-icons/react';
import { useState } from 'react';

const eur = (c: number) => formatEuros(c, { decimales: 'toujours' });

/**
 * Marge privée et mentions obligatoires (✓ / !) dépliées par un bouton à flèche, en bas du panneau Options ; calculées par les
 * mêmes fonctions que le serveur. Jamais d'aperçu du PDF (DEV-05).
 */
export function PanneauMentions({
  totaux,
  mentions,
}: {
  totaux: Totaux;
  mentions: ResultatMentions;
}) {
  const ok = mentions.liste.filter((m) => m.ok).length;
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="grid content-start gap-3">
      <p className="m-0 flex justify-between text-sm text-neutre-700">
        <span>Marge HT (visible par vous seul)</span>
        <span>{eur(totaux.margeHtCentimes)}</span>
      </p>
      <section className="grid gap-2">
        <h2 className="m-0 text-base">
          <button
            type="button"
            aria-expanded={ouvert}
            aria-controls="mentions-liste"
            onClick={() => setOuvert((o) => !o)}
            className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[8px] border border-trait bg-blanc px-3 text-left font-bold text-texte hover:bg-neutre-100 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="flex-1">Mentions obligatoires</span>
            <span className={cn('text-sm', mentions.ok ? 'text-succes' : 'text-danger')}>
              {ok} / {mentions.liste.length}
            </span>
            <CaretDownIcon
              size={18}
              aria-hidden="true"
              className={cn(
                'transition-transform motion-reduce:transition-none',
                ouvert && 'rotate-180',
              )}
            />
          </button>
        </h2>
        <ul
          id="mentions-liste"
          hidden={!ouvert}
          className="m-0 grid list-none gap-1.5 p-0 text-sm"
          aria-label="Mentions obligatoires"
        >
          {mentions.liste.map((m) => (
            <li key={m.cle} className="flex items-start gap-2" data-mention={m.cle} data-ok={m.ok}>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 flex-none items-center justify-center rounded-full text-xs font-bold',
                  m.ok
                    ? 'bg-succes-fond text-succes'
                    : m.conseil
                      ? 'bg-neutre-100 text-neutre-700'
                      : 'bg-danger-fond text-danger',
                )}
              >
                {m.ok ? '✓' : m.conseil ? 'i' : '!'}
              </span>
              <span className={m.ok || !m.conseil ? undefined : 'text-neutre-700'}>
                {m.libelle}
                {!m.ok && m.conseil ? ' · conseillé' : ''}
                <span className="sr-only">
                  {m.ok
                    ? ' : présente'
                    : m.conseil
                      ? ' : conseillée, non bloquante'
                      : ' : manquante'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
