import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../cn';

const badge = cva(
  'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutre: 'bg-neutre-100 text-neutre-800',
        accent: 'bg-accent-100 text-accent-800',
        premium: 'bg-premium-fond text-premium-texte ring-1 ring-premium',
        succes: 'bg-succes-fond text-succes',
        attention: 'bg-attention-fond text-attention',
        danger: 'bg-danger-fond text-danger',
        info: 'bg-info-fond text-info',
      },
    },
    defaultVariants: { tone: 'neutre' },
  },
);

export type Tone = NonNullable<VariantProps<typeof badge>['tone']>;

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badge> {}

export function Badge({ tone, className, ...rest }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...rest} />;
}

export interface StatusBadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Libellé et ton viennent des tables de statuts de @ph/core/constantes (jamais écrits dans l'écran). */
  statut: { libelle: string; tone: Tone };
}

/** Badge de statut avec pastille : demandes, appels d'offres, diagnostic, admin. */
export function StatusBadge({ statut, className, ...rest }: StatusBadgeProps) {
  return (
    <span className={cn(badge({ tone: statut.tone }), className)} {...rest}>
      <span aria-hidden="true" className="size-1.5 rounded-pill bg-current" />
      {statut.libelle}
    </span>
  );
}
