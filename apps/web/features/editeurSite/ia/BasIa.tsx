'use client';

import { bouton } from '@ph/ui';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import type { SuggestionIa } from './suggestionsIa';

/** Bas du panneau IA : suggestions en un clic, puis la création de tout le site. */
export function BasIa({ suggestions }: { suggestions: SuggestionIa[] }) {
  return (
    <>
      {suggestions.length ? (
        <div className="grid gap-1.5 [grid-template-columns:minmax(0,1fr)]">
          <span className="text-xs font-bold tracking-wide text-neutre-600 uppercase">
            Suggestions
          </span>
          {suggestions.map((sg) => (
            <button
              key={sg.label}
              type="button"
              onClick={sg.faire}
              className="min-h-11 rounded-[8px] border border-trait px-3 py-2 text-left text-[13px] font-semibold break-words text-neutre-800 hover:border-accent-300 hover:bg-accent-100"
            >
              {sg.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 rounded-[10px] bg-neutre-100 p-3 [grid-template-columns:minmax(0,1fr)]">
        <strong className="text-sm">Créer tout le site avec l’IA</strong>
        <span className="text-[13px] leading-[18px] text-neutre-700">
          Quelques questions simples, puis l’IA crée toutes vos pages. Votre site actuel est gardé
          dans Modèles.
        </span>
        <Link
          href={routes.proSiteCreationIa}
          className={bouton({ variant: 'secondaire', pleineLargeur: true })}
        >
          Créer tout le site avec l’IA
        </Link>
      </div>
    </>
  );
}
