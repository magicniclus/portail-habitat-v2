/** Mise en ligne automatique de la fiche (COMPTES §3 « Mise en ligne dans l'annuaire », ONB-06b). */

export type StatutDocument = 'en_attente' | 'valide' | 'refuse' | 'expire';

/** Statut du document le plus récent de chaque type. */
export function derniersStatutsDocuments(
  documents: readonly { type: string; statut: StatutDocument; le: number }[],
): Partial<Record<string, StatutDocument>> {
  const r: Partial<Record<string, { statut: StatutDocument; le: number }>> = {};
  for (const d of documents) if (!r[d.type] || r[d.type]!.le < d.le) r[d.type] = d;
  return Object.fromEntries(Object.entries(r).map(([t, d]) => [t, d!.statut]));
}

/** Envoyé : en attente de vérification (vérifiée ensuite sous 48 h) ou déjà validé. */
const envoye = (s?: StatutDocument) => s === 'en_attente' || s === 'valide';

/**
 * La fiche passe en ligne dès que le Kbis (ou un SIREN vérifié) et l'attestation décennale sont
 * envoyés ; la vérification par un modérateur vient ensuite (un refus retire la fiche).
 */
export function doitPasserEnLigne(a: {
  enLigne: boolean;
  statut: string;
  sirenVerifie: boolean;
  documents: Partial<Record<string, StatutDocument>>;
}): boolean {
  if (a.enLigne || a.statut !== 'actif') return false;
  return (a.sirenVerifie || envoye(a.documents.kbis)) && envoye(a.documents.decennale);
}

/** Libellés des pièces (TYPES_DOCUMENT) et de leur vérification, pour Ma fiche. */
export const LIBELLES_TYPE_DOCUMENT: Record<string, string> = {
  kbis: 'Extrait Kbis',
  decennale: 'Attestation décennale',
  rc_pro: 'Responsabilité civile professionnelle',
  rge: 'Certificat RGE',
  qualibat: 'Certificat Qualibat',
  piece_identite: "Pièce d'identité du dirigeant",
  urssaf_vigilance: 'Attestation de vigilance URSSAF',
};

export const LIBELLES_STATUT_DOCUMENT: Record<StatutDocument, string> = {
  en_attente: 'En cours de vérification',
  valide: 'Vérifié',
  refuse: 'Refusé',
  expire: 'Expiré',
};
