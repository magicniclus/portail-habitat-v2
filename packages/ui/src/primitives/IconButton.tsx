import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';
import { bouton } from './Button';

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Obligatoire : l'icône seule n'est pas lisible par un lecteur d'écran. */
  'aria-label': string;
  icone: ReactNode;
  variant?: 'secondaire' | 'fantome';
}

/** Bouton carré de 44 px contenant une icône. */
export function IconButton({
  icone,
  variant = 'fantome',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(bouton({ variant }), 'size-11 min-w-11 p-0 text-texte', className)}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex text-[22px]">
        {icone}
      </span>
    </button>
  );
}
