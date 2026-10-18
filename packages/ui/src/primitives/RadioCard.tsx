import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

export interface RadioCardGroupProps extends ComponentProps<'fieldset'> {
  legende: ReactNode;
  /** Masque visuellement la légende (elle reste lue). */
  legendeMasquee?: boolean;
}

export function RadioCardGroup({
  legende,
  legendeMasquee,
  className,
  children,
  ...rest
}: RadioCardGroupProps) {
  return (
    <fieldset className={cn('m-0 min-w-0 border-0 p-0', className)} {...rest}>
      <legend className={cn('mb-2 text-[15px] font-semibold', legendeMasquee && 'sr-only')}>
        {legende}
      </legend>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        {children}
      </div>
    </fieldset>
  );
}

export interface RadioCardProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  titre: ReactNode;
  description?: ReactNode;
  /** Élément à droite (prix, badge). */
  complement?: ReactNode;
}

/** Choix unique présenté en carte ; radio native, donc clavier et lecteurs d'écran sans script. */
export function RadioCard({ titre, description, complement, className, ...rest }: RadioCardProps) {
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-card border border-neutre-300 bg-blanc p-4 transition-colors',
        'hover:border-accent has-checked:border-accent has-checked:bg-accent-100 has-focus-visible:outline-2 has-focus-visible:outline-accent-300',
        'has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <input
        type="radio"
        className="mt-1 size-5 flex-none cursor-pointer accent-accent-action focus-visible:outline-none"
        {...rest}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{titre}</span>
        {description && <span className="text-sm text-neutre-700">{description}</span>}
      </span>
      {complement && <span className="flex-none">{complement}</span>}
    </label>
  );
}
