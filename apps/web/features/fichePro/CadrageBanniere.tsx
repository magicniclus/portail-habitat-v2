'use client';

import type { CadrageBanniere as Cadrage } from '@ph/core/annuaire';
import { cn } from '@ph/ui';

const OPTIONS: [Cadrage, string][] = [
  ['haut', 'Haut'],
  ['centre', 'Centre'],
  ['bas', 'Bas'],
];

/** Partie de la bannière gardée visible quand elle est rognée (centre par défaut). */
export function CadrageBanniere({
  valeur,
  onChange,
  desactive,
}: {
  valeur: Cadrage;
  onChange: (c: Cadrage) => void;
  desactive?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Cadrage de la bannière"
      className="flex overflow-hidden rounded-control border border-trait bg-blanc shadow-sm"
    >
      {OPTIONS.map(([v, libelle]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={valeur === v}
          disabled={desactive}
          onClick={() => onChange(v)}
          className={cn(
            'min-h-11 border-r border-trait px-3 text-sm font-semibold last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
            valeur === v ? 'bg-accent text-blanc' : 'text-texte hover:bg-neutre-100',
          )}
        >
          {libelle}
        </button>
      ))}
    </div>
  );
}
