import { cn } from '@ph/ui';
import { WarningCircleIcon } from '@phosphor-icons/react/ssr';

/**
 * Fiche en ligne sans assurance vérifiée (ni décennale ni RC Pro : facultatives depuis le
 * 01/11/2026, tous les métiers n'ont pas de décennale) : affiché sur la fiche et dans l'annuaire.
 */
export function AssuranceNonVerifiee({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-pill bg-neutre-100 px-2.5 py-1 text-xs font-semibold text-neutre-800',
        className,
      )}
    >
      <WarningCircleIcon size={15} aria-hidden="true" />
      Assurance non vérifiée
    </span>
  );
}
