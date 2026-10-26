import { cn } from '@ph/ui';
import type { ComponentProps, ReactNode } from 'react';

/** Colonnes partagées par l'en-tête coloré et les lignes (captures : complet ou rapide). */
export const COLONNES = {
  complet: 'grid-cols-4 sm:grid-cols-[96px_minmax(0,1fr)_72px_76px_96px_70px_96px_44px]',
  rapide: 'grid-cols-2 sm:grid-cols-[96px_minmax(0,1fr)_70px_120px_44px]',
} as const;

/** Case en pointillés d'une ligne (désignation, quantité, prix…). */
export const caseLigne =
  'min-h-11 w-full min-w-0 rounded-[6px] border border-dashed border-neutre-300 bg-blanc px-2.5 text-base text-texte placeholder:text-neutre-500 placeholder:italic focus:border-solid focus:border-accent focus:bg-accent-100 focus:outline-none';

/**
 * Cases en pointillés de la feuille (captures du propriétaire) : un champ par case, les cases
 * empilées forment un bloc (client, adresse de livraison). 16 px, 44 px de haut (MOBILE).
 */
export function BlocCases({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid divide-y divide-dashed divide-neutre-300 rounded-[6px] border border-dashed border-neutre-300 bg-blanc',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Case({
  className,
  principal,
  ...rest
}: ComponentProps<'input'> & { 'aria-label': string; principal?: boolean }) {
  return (
    <input
      className={cn(
        'min-h-11 w-full min-w-0 border-0 bg-transparent px-2.5 text-base text-texte placeholder:text-neutre-500 placeholder:italic focus:bg-accent-100 focus:outline-2 focus:-outline-offset-2 focus:outline-accent',
        principal && 'bg-neutre-100 font-semibold',
        className,
      )}
      {...rest}
    />
  );
}

/** Rangée de deux cases côte à côte (code postal | ville). */
export function DeuxCases({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] divide-x divide-dashed divide-neutre-300">
      {children}
    </div>
  );
}
