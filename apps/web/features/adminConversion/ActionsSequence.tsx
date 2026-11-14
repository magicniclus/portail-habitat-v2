'use client';

import { ConfirmationAdmin } from '@/features/admin/ConfirmationAdmin';
import { basculerSequence, dupliquerSequence } from './actions';

/** Pause, reprise, duplication d'une séquence : motif obligatoire, version et audit. */
export function ActionsSequence({
  id,
  actif,
  desactive,
}: {
  id: string;
  actif: boolean;
  desactive?: string | undefined;
}) {
  return (
    <>
      <ConfirmationAdmin
        libelle={actif ? 'Mettre en pause' : 'Réactiver'}
        titre={actif ? `Mettre ${id} en pause` : `Réactiver ${id}`}
        description="Les entreprises en cours restent dans la séquence ; leurs envois reprennent à la réactivation."
        desactive={desactive}
        onConfirmer={(motif) => basculerSequence(id, !actif, motif)}
      />
      <ConfirmationAdmin
        libelle="Dupliquer"
        titre={`Dupliquer ${id}`}
        description="La copie est enregistrée en pause, sous un nouvel identifiant."
        desactive={desactive}
        onConfirmer={(motif) => dupliquerSequence(id, motif)}
      />
    </>
  );
}
