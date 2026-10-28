'use client';

import { cn } from '@ph/ui';
import { useId, type ReactNode } from 'react';

/**
 * Commandes du panneau de droite (maquette Editeur de Site) : groupes titrés, boutons segmentés,
 * interrupteurs, curseurs avec valeur, pastilles de couleur. Cibles de 44 px (MOBILE).
 */
export function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h3 id={id} className="m-0 text-[11px] font-bold tracking-[0.08em] text-neutre-600 uppercase">
        {titre}
      </h3>
      {children}
    </section>
  );
}

/** Libellé à gauche, valeur ou commande à droite. */
export function Libelle({
  texte,
  droite,
  htmlFor,
}: {
  texte: string;
  droite?: ReactNode;
  htmlFor?: string;
}) {
  return (
    <span className="flex items-center justify-between gap-2 text-[13px]">
      <label htmlFor={htmlFor} className="font-bold text-neutre-800">
        {texte}
      </label>
      {droite !== undefined ? (
        <span className="text-xs whitespace-nowrap text-neutre-600">{droite}</span>
      ) : null}
    </span>
  );
}

export function Segments<T extends string | number>({
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
    <div className="grid gap-1.5">
      <Libelle texte={libelle} />
      <div
        role="radiogroup"
        aria-label={libelle}
        className="flex overflow-hidden rounded-[9px] border border-trait"
      >
        {options.map(([v, l]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={v === valeur}
            onClick={() => onChange(v)}
            className={cn(
              'min-h-11 flex-1 border-r border-trait px-2 text-[13px] font-semibold whitespace-nowrap last:border-r-0',
              v === valeur
                ? 'bg-accent text-blanc'
                : 'bg-blanc text-neutre-800 hover:bg-neutre-100',
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Interrupteur({
  libelle,
  actif,
  onChange,
  aide,
}: {
  libelle: string;
  actif: boolean;
  onChange: (v: boolean) => void;
  aide?: string;
}) {
  return (
    <div className="grid gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        onClick={() => onChange(!actif)}
        className="flex min-h-11 items-center justify-between gap-3 text-left text-[13px] font-bold text-neutre-800"
      >
        <span>{libelle}</span>
        <span
          aria-hidden="true"
          className={cn(
            'relative h-5 w-9 flex-none rounded-full transition-colors motion-reduce:transition-none',
            actif ? 'bg-accent' : 'bg-neutre-300',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-4 rounded-full bg-blanc shadow transition-[left] motion-reduce:transition-none',
              actif ? 'left-[18px]' : 'left-0.5',
            )}
          />
        </span>
      </button>
      {aide ? <Info>{aide}</Info> : null}
    </div>
  );
}

export function Curseur({
  libelle,
  valeur,
  min,
  max,
  pas = 1,
  unite = 'px',
  suffixe,
  onChange,
}: {
  libelle: string;
  valeur: number;
  min: number;
  max: number;
  pas?: number;
  unite?: string;
  /** Après la valeur : « Ordinateur » pour un réglage par appareil. */
  suffixe?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <Libelle
        texte={libelle}
        htmlFor={id}
        droite={`${valeur} ${unite}${suffixe ? ` · ${suffixe}` : ''}`}
      />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11 w-full accent-accent"
      />
    </div>
  );
}

export function Info({ children }: { children: ReactNode }) {
  return <p className="m-0 text-xs leading-[17px] text-neutre-700">{children}</p>;
}

/** Bouton d'action pleine largeur du panneau (« + Ajouter une section dans cette zone »). */
export function Action({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 rounded-[10px] border border-accent-200 bg-accent-100 px-3 text-left text-[13px] font-semibold text-accent-800 hover:border-accent-300 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
