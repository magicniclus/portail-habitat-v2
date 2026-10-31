'use client';

import { Interrupteur } from '@ph/ui';
import { useId } from 'react';

const champ =
  'min-h-11 w-full max-w-[420px] rounded-[8px] border border-trait bg-blanc px-3 text-base font-mono';

export function Identifiant({
  libelle,
  aide,
  valeur,
  exemple,
  erreur,
  onChange,
}: {
  libelle: string;
  aide: string;
  valeur: string;
  exemple: string;
  erreur?: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-neutre-800">
        {libelle}
      </label>
      <input
        id={id}
        value={valeur}
        placeholder={exemple}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={Boolean(erreur)}
        aria-describedby={`${id}-aide`}
        onChange={(e) => onChange(e.target.value)}
        className={`${champ} ${erreur ? 'border-danger' : ''}`}
      />
      <span id={`${id}-aide`} className={`text-xs ${erreur ? 'text-danger' : 'text-neutre-600'}`}>
        {erreur ?? aide}
      </span>
    </div>
  );
}

export function Evenement({
  libelle,
  detail,
  actif,
  onChange,
}: {
  libelle: string;
  detail: string;
  actif: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 border-t border-trait pt-3 first:border-t-0 first:pt-0">
      <span className="grid gap-0.5">
        <label htmlFor={id} className="text-sm font-semibold">
          {libelle}
        </label>
        <span className="text-xs text-neutre-600">{detail}</span>
      </span>
      <Interrupteur id={id} checked={actif} onCheckedChange={onChange} />
    </div>
  );
}
