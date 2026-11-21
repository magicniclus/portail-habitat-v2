'use client';

import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { activerSource } from './actionsSources';

export function BasculeSource({
  id,
  nom,
  actif,
  peut,
}: {
  id: string;
  nom: string;
  actif: boolean;
  peut: boolean;
}) {
  return (
    <ConfirmationAdmin
      libelle={actif ? 'Couper la source' : 'Rouvrir la source'}
      titre={`${actif ? 'Couper' : 'Rouvrir'} : ${nom}`}
      description={
        actif
          ? 'Les prochains envois du partenaire seront refusés.'
          : 'Le partenaire peut de nouveau envoyer des demandes.'
      }
      danger={actif}
      desactive={peut ? undefined : 'Permission requise : matching.config'}
      onConfirmer={(motif) => activerSource(id, !actif, motif)}
    />
  );
}
