import type { ReactNode } from 'react';

/**
 * Barre de progression de la fiche (logo, description, bannière), fixée en haut de Ma fiche tant
 * qu’elle n’est pas complète, avec ce qu’il reste à faire.
 */
export function ProgressionFiche({
  pourcent,
  manquants = [],
  action,
}: {
  pourcent: number;
  /** Ce qu'il reste à faire (« Ajouter votre logo »…), annoncé sous la barre. */
  manquants?: string[];
  /** À gauche de la barre (« Remplir ma fiche avec l'IA »). */
  action?: ReactNode;
}) {
  return (
    <div className="sticky top-[65px] z-10 -mx-[clamp(16px,3vw,32px)] -mt-[clamp(20px,3vw,32px)] flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-trait bg-blanc/95 px-[clamp(16px,3vw,32px)] py-2.5 backdrop-blur-sm">
      {action}
      <span className="text-sm font-semibold whitespace-nowrap max-sm:sr-only">
        Fiche complétée à {pourcent} %
      </span>
      <div
        role="progressbar"
        aria-label="Fiche complétée"
        aria-valuenow={pourcent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-pill bg-neutre-300"
      >
        <span
          className="block h-full bg-accent motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${pourcent}%` }}
        />
      </div>
      {manquants.length ? (
        <p className="m-0 w-full text-[13px] text-neutre-700">
          Pour mettre votre fiche en ligne : {manquants.join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
