import { cn } from '@ph/ui';
import { niveauxEditeur } from '@ph/ui/tokens';

/** Légende des couleurs du panneau Structure (mêmes couleurs que l'aperçu). */
export function LegendeStructure() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0 text-xs text-neutre-700">
      {(
        [
          ['nav', 'Global'],
          ['zone', 'Zone'],
          ['section', 'Section'],
          ['bloc', 'Bloc'],
          ['element', 'Contenu'],
        ] as const
      ).map(([k, l]) => (
        <li key={k} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn('size-[9px]', k === 'element' ? 'rounded-full' : 'rounded-[2px]')}
            style={{ background: niveauxEditeur[k] }}
          />
          {l}
        </li>
      ))}
    </ul>
  );
}
