'use client';

import { cn } from '@ph/ui';

/** Onglets segmentés des panneaux de gauche (Ajouter, Référencement, Modèles). */
export function Onglets<T extends string>({
  libelle,
  valeur,
  options,
  onChange,
}: {
  libelle: string;
  valeur: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={libelle}
      className="flex overflow-hidden rounded-[9px] border border-trait"
    >
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={v === valeur}
          onClick={() => onChange(v)}
          className={cn(
            'min-h-11 flex-1 border-r border-trait px-2 text-[13px] last:border-r-0',
            v === valeur
              ? 'bg-neutre-100 font-bold text-texte'
              : 'bg-blanc font-medium text-neutre-700',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
