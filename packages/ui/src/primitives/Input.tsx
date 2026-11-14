'use client';

import type { ComponentProps } from 'react';
import { cn } from '../cn';
import { ATTRIBUTS_CHAMP, CLASSES_CHAMP, type TypeChamp } from './champs';
import { useChamp } from './Field';

/** Chaîne fixe (pas d'appel à `cn` au chargement du module : il resterait dans tous les paquets JS). */
export const classesControle = `min-h-11 ${CLASSES_CHAMP}`;

export interface InputProps extends ComponentProps<'input'> {
  /** Préréglage MOBILE.md §5 (clavier, autocomplete…). Les props explicites l'emportent. */
  champ?: TypeChamp;
}

export function Input({ champ, className, ...rest }: InputProps) {
  const ctx = useChamp();
  return (
    <input
      id={ctx.id}
      aria-describedby={ctx.describedBy}
      aria-invalid={ctx.invalide || undefined}
      required={ctx.requis}
      {...(champ ? ATTRIBUTS_CHAMP[champ] : {})}
      className={cn(classesControle, className)}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  const ctx = useChamp();
  return (
    <textarea
      id={ctx.id}
      aria-describedby={ctx.describedBy}
      aria-invalid={ctx.invalide || undefined}
      required={ctx.requis}
      className={cn(classesControle, 'min-h-28 resize-y leading-relaxed', className)}
      {...rest}
    />
  );
}

/** Liste native (roue iOS, liste Android) : `<option>` et `<optgroup>` en enfants. */
export function Select({ className, ...rest }: ComponentProps<'select'>) {
  const ctx = useChamp();
  return (
    <select
      id={ctx.id}
      aria-describedby={ctx.describedBy}
      aria-invalid={ctx.invalide || undefined}
      required={ctx.requis}
      className={cn(classesControle, 'cursor-pointer pr-9', className)}
      {...rest}
    />
  );
}
