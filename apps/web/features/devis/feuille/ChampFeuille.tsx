import { cn } from '@ph/ui';
import type { ComponentProps } from 'react';

/**
 * Champ posé sur la feuille A4 : se lit comme du texte imprimé, se révèle au survol et au focus
 * (bordure pointillée puis cadre). 16 px sur mobile (pas de zoom iOS), libellé accessible exigé.
 */
const classes =
  'w-full min-w-0 rounded-[6px] border border-transparent bg-transparent px-1.5 py-1 text-base text-texte placeholder:text-neutre-500 hover:border-dashed hover:border-neutre-400 focus:border-solid focus:border-accent focus:bg-blanc focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';

export function ChampFeuille({
  className,
  ...rest
}: ComponentProps<'input'> & { 'aria-label': string }) {
  return <input className={cn(classes, 'min-h-11', className)} {...rest} />;
}

/** Zone de texte de la feuille (désignation, description) : hauteur ajustée au contenu. */
export function ZoneFeuille({
  className,
  ...rest
}: ComponentProps<'textarea'> & { 'aria-label': string }) {
  return (
    <textarea
      rows={1}
      className={cn(classes, 'min-h-11 resize-none [field-sizing:content]', className)}
      {...rest}
    />
  );
}
