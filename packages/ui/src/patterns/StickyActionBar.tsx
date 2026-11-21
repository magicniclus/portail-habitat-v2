import type { ComponentProps } from 'react';
import { cn } from '../cn';

/**
 * Barre d'action collée en bas (parcours, fiche artisan) : reste au-dessus du clavier
 * et de la barre d'accueil iOS (MOB-04, safe-area).
 */
export function StickyActionBar({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 flex items-center gap-3 border-t border-trait bg-blanc/95 px-page pt-3 pb-sure backdrop-blur',
        className,
      )}
      {...rest}
    />
  );
}
