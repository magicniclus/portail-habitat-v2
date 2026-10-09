import { CheckIcon } from '@phosphor-icons/react/ssr';
import { cn } from '../cn';

export interface StepperProps {
  etapes: string[];
  /** Index de l'étape courante (0 = première). */
  courante: number;
  className?: string;
}

/** Étapes d'un parcours (simulateur, diagnostic, avis, onboarding). Sous 640 px : « Étape 2 sur 5 » + titre. */
export function Stepper({ etapes, courante, className }: StepperProps) {
  return (
    <nav aria-label="Étapes" className={className}>
      <p className="m-0 text-sm font-semibold text-neutre-700 sm:hidden">
        Étape {courante + 1} sur {etapes.length} ·{' '}
        <span className="text-texte">{etapes[courante]}</span>
      </p>
      <div
        aria-hidden="true"
        className="mt-2 h-1.5 overflow-hidden rounded-pill bg-neutre-200 sm:hidden"
      >
        <div
          className="h-full rounded-pill bg-accent"
          style={{ width: `${((courante + 1) / etapes.length) * 100}%` }}
        />
      </div>
      <ol className="m-0 hidden list-none gap-2 p-0 sm:flex">
        {etapes.map((etape, i) => {
          const etat = i < courante ? 'fait' : i === courante ? 'courant' : 'avenir';
          return (
            <li
              key={etape}
              aria-current={etat === 'courant' ? 'step' : undefined}
              className="flex flex-1 items-center gap-2 text-sm"
            >
              <span
                className={cn(
                  'grid size-7 flex-none place-items-center rounded-pill border-2 text-[13px] font-bold',
                  etat === 'fait' && 'border-accent bg-accent text-blanc',
                  etat === 'courant' && 'border-accent text-accent-700',
                  etat === 'avenir' && 'border-neutre-300 text-neutre-700',
                )}
              >
                {etat === 'fait' ? <CheckIcon weight="bold" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(etat === 'avenir' ? 'text-neutre-700' : 'font-semibold text-texte')}
              >
                {etape}
                {etat === 'fait' && <span className="sr-only"> (terminée)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
