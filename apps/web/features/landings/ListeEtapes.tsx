import type { Benefice } from '@ph/core/landings';
import { cn } from '@ph/ui';

/** Les trois étapes à gauche : pastille numérotée, titre, ligne de progression (`data-ligne`). */
export function ListeEtapes(p: {
  benefices: Benefice[];
  active: number;
  onChoisir: (i: number) => void;
}) {
  return (
    <div role="tablist" aria-label="Étapes" className="relative grid">
      <span
        aria-hidden="true"
        className="absolute top-[34px] bottom-[34px] left-[23px] w-0.5 rounded-sm bg-texte/10"
      />
      <span
        aria-hidden="true"
        data-ligne
        className="absolute top-[34px] bottom-[34px] left-[23px] w-0.5 origin-top scale-y-0 rounded-sm bg-accent will-change-transform"
      />
      {p.benefices.map((b, i) => {
        const actif = p.active === i;
        const passe = i < p.active;
        return (
          <button
            key={b.titre}
            type="button"
            role="tab"
            id={`etape-${i}`}
            aria-selected={actif}
            aria-controls={`etape-panneau-${i}`}
            onClick={() => p.onChoisir(i)}
            className="group relative z-[1] grid min-h-11 cursor-pointer grid-cols-[48px_minmax(0,1fr)] items-center gap-4 border-0 bg-transparent py-2 text-left font-[inherit] text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-12 items-center justify-center rounded-full border text-sm font-bold transition-[background-color,border-color,color,transform] duration-500 ease-out',
                actif
                  ? 'scale-110 border-accent bg-accent text-blanc'
                  : passe
                    ? 'border-accent bg-blanc text-accent-700'
                    : 'border-texte/15 bg-blanc/80 text-neutre-700 group-hover:border-accent-300',
              )}
            >
              {passe ? '✓' : `0${i + 1}`}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-500',
                  actif ? 'text-accent-700' : 'text-neutre-700',
                )}
              >
                Étape {i + 1}
              </span>
              <span
                className={cn(
                  'text-[clamp(18px,1.9vw,24px)] leading-[1.2] font-bold tracking-[-0.01em] transition-colors duration-500',
                  actif ? 'text-texte' : 'text-neutre-700',
                )}
              >
                {b.titre}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
