import type { VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../cn';
import { bouton } from './bouton';
import { Chargeur } from './Chargeur';

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof bouton> {
  /** Rend l'enfant (ex. `<Link>`) avec le style du bouton, sans dupliquer le style. */
  asChild?: boolean;
  /** Action en cours : chargeur devant le libellé, bouton désactivé et annoncé occupé. */
  chargement?: boolean;
}

export function Button({
  asChild = false,
  variant,
  taille,
  pleineLargeur,
  className,
  type,
  chargement = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  if (asChild)
    return (
      <Slot.Root
        className={cn(bouton({ variant, taille, pleineLargeur }), className)}
        {...(disabled !== undefined ? { disabled } : {})}
        {...rest}
      >
        {children}
      </Slot.Root>
    );
  return (
    <button
      className={cn(bouton({ variant, taille, pleineLargeur }), className)}
      type={type ?? 'button'}
      disabled={disabled || chargement}
      {...(chargement ? { 'aria-busy': true } : {})}
      {...rest}
      // Occupé n'est pas indisponible : couleurs pleines, curseur d'attente.
      {...(chargement ? { style: { ...rest.style, opacity: 1, cursor: 'progress' } } : {})}
    >
      {chargement ? <Chargeur taille="sm" ton="courant" decoratif /> : null}
      {children}
    </button>
  );
}
