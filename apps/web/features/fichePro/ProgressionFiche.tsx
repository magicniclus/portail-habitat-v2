/** Hauteur fixe de la barre : l'aperçu côté particulier se colle juste dessous. */
export const HAUTEUR_PROGRESSION = 44;

/**
 * Barre de progression de la fiche, fixée sous l'en-tête de Ma fiche tant qu’elle n’est pas
 * complète (remplace la liste des points à compléter).
 */
export function ProgressionFiche({ pourcent }: { pourcent: number }) {
  return (
    <div className="sticky top-(--entete-pro,65px) z-10 h-11 -mx-[clamp(16px,3vw,32px)] -mt-[clamp(20px,3vw,32px)] flex items-center gap-3 border-b border-trait bg-blanc/95 px-[clamp(16px,3vw,32px)] backdrop-blur-sm">
      <span className="text-sm font-semibold whitespace-nowrap">
        Fiche complétée à {pourcent} %
      </span>
      <div
        role="progressbar"
        aria-label="Fiche complétée"
        aria-valuenow={pourcent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 flex-1 overflow-hidden rounded-pill bg-neutre-300"
      >
        <span
          className="block h-full bg-accent motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${pourcent}%` }}
        />
      </div>
    </div>
  );
}
