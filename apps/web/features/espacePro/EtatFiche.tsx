import type { ResumeArtisan } from '@ph/firebase/comptes';
import { cn } from '@ph/ui';

/** Pastille de l'en-tête : fiche en ligne (ville · rayon) ou hors ligne. */
export function EtatFiche({ artisan }: { artisan: ResumeArtisan }) {
  const zone = [artisan.ville, artisan.rayonKm ? `${artisan.rayonKm} km` : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <span
      className={cn(
        'hidden items-center gap-2 truncate rounded-pill border px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap sm:inline-flex',
        artisan.enLigne
          ? 'border-accent-300 bg-accent-100 text-accent-800'
          : 'border-trait bg-neutre-100 text-neutre-800',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', artisan.enLigne ? 'bg-accent' : 'bg-neutre-500')}
      />
      {artisan.enLigne ? `Fiche en ligne · ${zone}` : 'Fiche hors ligne'}
    </span>
  );
}
