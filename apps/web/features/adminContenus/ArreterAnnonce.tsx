'use client';

import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { arreterAnnonce } from './actions';

export function ArreterAnnonce({ id, titre, peut }: { id: string; titre: string; peut: boolean }) {
  return (
    <ConfirmationAdmin
      libelle="Arrêter"
      titre={`Arrêter l’annonce : ${titre}`}
      description="Elle disparaît aussitôt des espaces."
      danger
      desactive={peut ? undefined : 'Permission requise : annonces.gerer'}
      onConfirmer={(motif) => arreterAnnonce(id, motif)}
    />
  );
}
