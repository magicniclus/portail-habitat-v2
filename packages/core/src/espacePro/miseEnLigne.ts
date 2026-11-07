/** Mise en ligne de la fiche (COMPTES §3 « Mise en ligne dans l'annuaire ») et pièces envoyées. */

export type StatutDocument = 'en_attente' | 'valide' | 'refuse' | 'expire';

/** Statut du document le plus récent de chaque type. */
export function derniersStatutsDocuments(
  documents: readonly { type: string; statut: StatutDocument; le: number }[],
): Partial<Record<string, StatutDocument>> {
  const r: Partial<Record<string, { statut: StatutDocument; le: number }>> = {};
  for (const d of documents) if (!r[d.type] || r[d.type]!.le < d.le) r[d.type] = d;
  return Object.fromEntries(Object.entries(r).map(([t, d]) => [t, d!.statut]));
}

/**
 * Mise en ligne automatique de la fiche (décision du propriétaire, 01/11/2026) : dès que le
 * minimum est fait (logo, description, bannière : complétude 100 %), sauf si l'artisan l'a
 * mise hors ligne lui-même (interrupteur « En ligne ») ; jamais une entreprise suspendue.
 */
export function doitPasserEnLigne(a: {
  enLigne: boolean;
  statut: string;
  completude: number;
  horsLigneVolontaire: boolean;
}): boolean {
  return !a.enLigne && a.statut === 'actif' && a.completude >= 100 && !a.horsLigneVolontaire;
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
