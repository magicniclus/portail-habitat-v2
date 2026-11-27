'use client';

import { Chargeur, cn } from '@ph/ui';
import { useLinkStatus } from 'next/link';

/**
 * À placer dans un `<Link>` de menu : petit chargeur sur le lien cliqué tant que la page visée
 * charge (sans `loading.tsx`, qui figerait le code HTTP à 200 avant un 403 ou une redirection).
 * Affiché après 150 ms seulement : rien ne clignote sur une page rapide.
 */
export function ChargementLien({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <Chargeur
      taille="xs"
      ton="courant"
      decoratif
      className={cn('animate-[apparaitre-apres_.15s_step-end_both]', className)}
    />
  ) : null;
}
