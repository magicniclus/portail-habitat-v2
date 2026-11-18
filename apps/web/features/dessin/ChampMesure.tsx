'use client';

import { lireMesure } from '@ph/core/dessin';
import { formatNombre } from '@ph/core/format';
import { Field, Input } from '@ph/ui';
import { useState } from 'react';

/**
 * Champ d'une mesure (cm ou m), appliqué à la sortie du champ ou avec Entrée. Tant qu'on ne tape
 * pas, il affiche la valeur du plan (pas de remontage, le focus reste en place) ; une saisie vide,
 * illisible ou sous le minimum n'applique rien et la valeur revient.
 */
export function ChampMesure({
  label,
  aide,
  mm,
  unite = 'cm',
  min = 0,
  desactive,
  appliquer,
}: {
  label: string;
  aide?: string;
  mm: number;
  unite?: 'cm' | 'm';
  /** Plus petite valeur acceptée (mm). */
  min?: number;
  desactive?: boolean;
  appliquer: (mm: number) => void;
}) {
  const [saisie, setSaisie] = useState<string | null>(null);
  const affiche = unite === 'cm' ? String(Math.round(mm / 10)) : formatNombre(mm / 1000, 2);
  const valider = () => {
    if (saisie === null) return;
    const v = lireMesure(saisie, unite);
    if (v !== null && v >= min && v !== mm) appliquer(v);
    setSaisie(null);
  };
  return (
    <Field label={label} {...(aide ? { aide } : {})}>
      <Input
        inputMode="decimal"
        disabled={desactive}
        value={saisie ?? affiche}
        onChange={(ev) => setSaisie(ev.target.value)}
        onBlur={valider}
        onKeyDown={(ev) => {
          if (ev.key !== 'Enter') return;
          ev.preventDefault();
          valider();
        }}
      />
    </Field>
  );
}
