/** Libellés affichés des devis et factures (règle : aucun libellé de statut en dur dans le site). */
export const LIBELLES_STATUT_DEVIS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
  archive: 'Archivé',
} as const;

export const LIBELLES_STATUT_FACTURE = {
  brouillon: 'Brouillon',
  emise: 'Émise',
  partiellement_payee: 'Partiellement payée',
  payee: 'Payée',
  impayee: 'Impayée',
} as const;

export const LIBELLES_TYPE_FACTURE = {
  facture: 'Facture',
  acompte: 'Facture d’acompte',
  avoir: 'Avoir',
} as const;

export const LIBELLES_MOYEN_PAIEMENT = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  carte: 'Carte',
} as const;

/** Ton de la pastille : neutre, en cours, réussi, échec. */
export function tonStatut(statut: string): 'neutre' | 'info' | 'succes' | 'danger' | 'attention' {
  if (['accepte', 'payee'].includes(statut)) return 'succes';
  if (['refuse', 'impayee'].includes(statut)) return 'danger';
  if (['envoye', 'emise'].includes(statut)) return 'info';
  if (statut === 'partiellement_payee') return 'attention';
  return 'neutre';
}
