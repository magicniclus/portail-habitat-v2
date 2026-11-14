/** Libellés affichés des devis et factures (règle : aucun libellé de statut en dur dans le site). */
export const LIBELLES_STATUT_DEVIS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
  archive: 'Archivé',
} as const;

/** Libellé affiché : un devis validé dont l'email n'est pas encore parti est « Validé ». */
export const libelleStatutDevis = (statut: string, envoyeAuClient: boolean): string =>
  statut === 'envoye' && !envoyeAuClient
    ? 'Validé'
    : (LIBELLES_STATUT_DEVIS[statut as keyof typeof LIBELLES_STATUT_DEVIS] ?? statut);

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

export const LIBELLES_NATURE_LIGNE = {
  prestation: 'Prestation',
  fourniture: 'Fourniture',
} as const;

/** Options › Type de document (éditeur A4). « Format électronique » : Factur-X, bientôt (D62). */
export const MODES_SAISIE = ['rapide', 'complet'] as const;
export type ModeSaisie = (typeof MODES_SAISIE)[number];
export const LIBELLES_MODE_SAISIE = {
  rapide: { titre: 'Rapide', aide: 'Désignation, TVA et montant.' },
  complet: { titre: 'Complet', aide: 'Quantité, unité et prix unitaire.' },
} as const;

/** Unités proposées sur une ligne (« Aucune » = vide). */
export const UNITES_LIGNE = [
  'u',
  'forfait',
  'h',
  'jour',
  'm',
  'ml',
  'm²',
  'm³',
  'kg',
  't',
  'l',
  'lot',
  'ens.',
] as const;
