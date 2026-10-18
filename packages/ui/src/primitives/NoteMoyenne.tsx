import { formatNombre } from '@ph/core/format';
import { cn } from '../cn';

export interface NoteMoyenneProps {
  note: number;
  nbAvis: number;
  /** `court` : « (24) » au lieu de « (24 avis) ». */
  court?: boolean;
  className?: string;
}

/**
 * « ★ 4,8 (24 avis) » : note moyenne d'un artisan. Rien n'est affiché sans avis (pas de fausse note).
 * L'étoile est décorative ; la phrase complète est lue par les lecteurs d'écran.
 */
export function NoteMoyenne({ note, nbAvis, court, className }: NoteMoyenneProps) {
  if (nbAvis <= 0) return null;
  const valeur = formatNombre(note, 1);
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span aria-hidden="true" className="text-etoile">
        ★
      </span>
      <strong aria-hidden="true">{valeur}</strong>
      <span aria-hidden="true" className="text-neutre-700">
        ({nbAvis}
        {court ? '' : ' avis'})
      </span>
      <span className="sr-only">
        Note {valeur} sur 5, {nbAvis} avis
      </span>
    </span>
  );
}
