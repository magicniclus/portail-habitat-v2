import type { ComponentProps } from 'react';
import { cn } from '../cn';

export const classesChip = [
  'inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-neutre-300 bg-blanc px-3.5',
  'text-[14.5px] font-semibold text-texte no-underline transition-colors hover:border-accent hover:text-texte',
  'aria-pressed:border-accent aria-pressed:bg-accent-100 aria-pressed:text-accent-800',
].join(' ');

export interface ChipProps extends ComponentProps<'button'> {
  /** Chip à bascule (filtre) : expose `aria-pressed`. Sans valeur, simple bouton. */
  selectionne?: boolean;
}

/** Pastille cliquable (projets populaires, filtres). Se replie à la ligne, jamais de défilement caché. */
export function Chip({ selectionne, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selectionne}
      className={cn(classesChip, className)}
      {...rest}
    />
  );
}

export interface ChipGroupProps extends ComponentProps<'div'> {
  /** Libellé du groupe, lu par les lecteurs d'écran. */
  libelle: string;
}

export function ChipGroup({ libelle, className, ...rest }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={libelle}
      className={cn('flex flex-wrap gap-2', className)}
      {...rest}
    />
  );
}
