'use client';

import { Banner } from '@ph/ui';
import { useSearchParams } from 'next/navigation';

/**
 * `?apercu=1` (lien « Voir ma fiche publique » de l'espace pro) : rappel que c'est la vue des
 * particuliers. La page reste statique (ISR) ; l'en-tête `X-Robots-Tag` la retire de l'index.
 */
export function BandeauApercu() {
  if (useSearchParams().get('apercu') !== '1') return null;
  return (
    <Banner tone="info" titre="Aperçu de votre fiche publique">
      Voici ce que voient les particuliers. Les modifications se font depuis votre espace pro.
    </Banner>
  );
}
