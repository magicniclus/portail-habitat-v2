import { LABEL_PREMIUM } from '@ph/core/paiements';
import { cn } from '@ph/ui';
import { SealCheckIcon } from '@phosphor-icons/react/ssr';

/**
 * Label « Premium Portail Travaux » (fiche publique, annuaire) : entreprises avec la visibilité
 * Fiche Pro (`badgeRecommande`, écrit par le webhook Stripe seulement).
 */
export function LabelPremium({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-pill border border-premium bg-premium-fond px-2.5 py-0.5 text-xs font-bold tracking-[0.04em] text-premium-texte uppercase',
        className,
      )}
    >
      <SealCheckIcon size={15} weight="fill" aria-hidden="true" className="text-premium" />
      {LABEL_PREMIUM}
    </span>
  );
}
