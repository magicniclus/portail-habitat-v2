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

/** Statuts de la vérification de l'entreprise (`artisans/{id}.verification.statut`). */
export type StatutVerification = 'a_faire' | 'en_cours' | 'verifie' | 'refuse' | 'expire';

interface EtatMiseEnLigne {
  /** SIREN trouvé au répertoire à l'inscription, ou vérifié par un modérateur (`sirenReconnu`). */
  sirenReconnu: boolean;
  verification: StatutVerification;
  statut: string;
  horsLigneVolontaire: boolean;
}

/** Ce que l'artisan ne peut pas lever lui-même : SIREN reconnu, ni refusé ni expiré, entreprise active. */
function sirenEnRegle(a: EtatMiseEnLigne): boolean {
  return (
    a.sirenReconnu &&
    a.verification !== 'refuse' &&
    a.verification !== 'expire' &&
    a.statut === 'actif'
  );
}

/**
 * Fiche en ligne (décision du propriétaire, 15/11/2026) : dès que le SIREN est reconnu, sans
 * attendre ni téléphone vérifié, ni attestation décennale, ni complétude ; jamais si le SIREN
 * n'est pas contrôlé, refusé ou expiré, si l'entreprise est suspendue, ou si l'artisan l'a mise
 * hors ligne lui-même (interrupteur « Fiche en ligne »).
 */
export function ficheDoitEtreEnLigne(a: EtatMiseEnLigne): boolean {
  return sirenEnRegle(a) && !a.horsLigneVolontaire;
}

/** Interrupteur « Fiche en ligne » : se rallume dès que le SIREN est en règle, fiche complète ou non. */
export function peutRallumer(a: EtatMiseEnLigne): boolean {
  return sirenEnRegle(a);
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
