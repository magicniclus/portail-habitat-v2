'use client';

import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { traiterDemandeRgpd } from './actions';

const LIBELLES = {
  acces: 'Générer l’export',
  portabilite: 'Générer l’export',
  effacement: 'Exécuter l’anonymisation',
  rectification: 'Marquer rectifié',
  opposition: 'Marquer traité',
} as const;

export function TraiterRgpd({ id, type }: { id: string; type: keyof typeof LIBELLES }) {
  return (
    <ConfirmationAdmin
      libelle={LIBELLES[type]}
      titre={LIBELLES[type]}
      description={
        type === 'effacement'
          ? 'Le compte est anonymisé et ses demandes en cours annulées. Irréversible.'
          : 'Une preuve de traitement est archivée.'
      }
      danger={type === 'effacement'}
      onConfirmer={(motif) => traiterDemandeRgpd(id, motif)}
    />
  );
}
