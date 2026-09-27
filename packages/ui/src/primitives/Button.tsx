import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../cn';

export const bouton = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-control border font-semibold whitespace-nowrap no-underline',
    'min-h-11 cursor-pointer transition-colors duration-150 select-none',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primaire:
          'border-accent-action bg-accent-action text-blanc hover:bg-accent-700 hover:border-accent-700 hover:text-blanc active:bg-accent-800',
        secondaire:
          'border-neutre-400 bg-blanc text-texte hover:bg-neutre-100 hover:text-texte active:bg-neutre-200',
        fantome:
          'border-transparent bg-transparent text-accent-700 hover:bg-accent-100 hover:text-accent-800 active:bg-accent-200',
        danger: 'border-danger bg-danger text-blanc hover:opacity-90 hover:text-blanc',
      },
      taille: {
        sm: 'px-3 text-sm',
        md: 'px-5 text-base',
        lg: 'min-h-12 px-6 text-[17px]',
      },
      pleineLargeur: { true: 'w-full whitespace-normal' },
    },
    defaultVariants: { variant: 'primaire', taille: 'md' },
  },
);

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
