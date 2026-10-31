import type { ComponentProps } from 'react';
import { cn } from '../cn';

/** Bloc de chargement ; l'animation s'arrête avec `prefers-reduced-motion`. */
export function Skeleton({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-control bg-neutre-200 motion-safe:animate-pulse', className)}
      {...rest}
    />
  );
}
