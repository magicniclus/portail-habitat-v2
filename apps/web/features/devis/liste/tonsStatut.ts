import type { tonStatut } from '@ph/core/devis';

/** Couleur du menu de statut (pastille) dans les listes : la même pour devis et factures. */
export const TON_STATUT: Record<ReturnType<typeof tonStatut>, string> = {
  neutre: 'border-trait bg-neutre-100 text-neutre-900',
  info: 'border-info/40 bg-info-fond text-info',
  succes: 'border-succes/40 bg-succes-fond text-succes',
  danger: 'border-danger/40 bg-danger-fond text-danger',
  attention: 'border-attention/40 bg-attention-fond text-attention',
};
