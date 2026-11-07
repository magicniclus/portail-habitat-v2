/**
 * Contrôles de l'étape SIREN (COMPTES §3.1) : entreprise fermée, activité hors bâtiment,
 * entreprise récente, SIREN déjà inscrit. Fonctions pures, appliquées au résultat de l'API.
 */
export interface EntrepriseTrouvee {
  siren: string;
  siret: string;
  raisonSociale: string;
  nomCommercial?: string;
  codeNaf?: string;
  /** Date de création (AAAA-MM-JJ). */
  dateCreation?: string;
  fermee: boolean;
  adresse: {
    ligne1: string;
    codePostal: string;
    ville: string;
    geo?: { latitude: number; longitude: number };
  };
}

export type Inscription = 'libre' | 'revendiquee' | 'non_revendiquee';

export interface AnalyseEntreprise {
  /** Refus avec message clair (entreprise fermée). */
  refusee: boolean;
  /** Acceptée, mais tâche `fraude_suspectee` dans la file de modération. */
  horsBatiment: boolean;
  /** Label « Nouvelle entreprise », décennale exigée avant la mise en ligne. */
  recente: boolean;
  /** `revendiquee` → « Cette entreprise a déjà un compte » ; `non_revendiquee` → revendication. */
  inscription: Inscription;
}

/** Section F (construction : divisions 41 à 43) ou 71.20B (diagnostiqueurs). */
export function estNafBatiment(codeNaf: string | undefined): boolean {
  if (!codeNaf) return false;
  const c = codeNaf.replace(/\s/g, '').toUpperCase();
  return /^4[1-3]\./.test(c) || c === '71.20B';
}

const TROIS_MOIS_MS = 92 * 86_400_000;

export function analyserEntreprise(
  e: Pick<EntrepriseTrouvee, 'codeNaf' | 'dateCreation' | 'fermee'>,
  inscription: Inscription,
  maintenant: number,
): AnalyseEntreprise {
  const creee = e.dateCreation ? Date.parse(`${e.dateCreation}T00:00:00Z`) : NaN;
  return {
    refusee: e.fermee,
    horsBatiment: !estNafBatiment(e.codeNaf),
    recente: Number.isFinite(creee) && maintenant - creee < TROIS_MOIS_MS,
    inscription,
  };
}
