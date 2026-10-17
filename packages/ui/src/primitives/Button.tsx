import type { VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../cn';
import { bouton } from './bouton';

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof bouton> {
  /** Rend l'enfant (ex. `<Link>`) avec le style du bouton, sans dupliquer le style. */
  asChild?: boolean;
}

export function Button({
  asChild = false,
  variant,
  taille,
  pleineLargeur,
  className,
  type,
  ...rest
}: ButtonProps) {
  const Composant = asChild ? Slot.Root : 'button';
  return (
    <Composant
      className={cn(bouton({ variant, taille, pleineLargeur }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...rest}
    />
  );
}
