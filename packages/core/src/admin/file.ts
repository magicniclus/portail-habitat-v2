import type { PermissionAdmin } from './permissions';

/**
 * File de travail (ADMIN §2.2, maquette « Admin File ») : chaque type de tâche, la permission qui
 * permet de la traiter, sa section et son délai cible. Priorité : 5 = la plus urgente.
 */
export interface TypeTache {
  libelle: string;
  permission: PermissionAdmin;
  /** Segment de la section où la traiter (`/admin/…`). */
  section: string;
  slaHeures: number;
}

export const TYPES_TACHES: Readonly<Record<string, TypeTache>> = {
  document: {
    libelle: 'Document',
    permission: 'documents.valider',
    section: 'artisans',
    slaHeures: 48,
  },
  artisan_nouveau: {
    libelle: 'Nouvel artisan',
    permission: 'artisans.verifier',
    section: 'artisans',
    slaHeures: 48,
  },
  fraude_suspectee: {
    libelle: 'Fraude suspectée',
    permission: 'demandes.annuler',
    section: 'demandes',
    slaHeures: 4,
  },
  avis: { libelle: 'Avis', permission: 'avis.moderer', section: 'avis', slaHeures: 24 },
  signalement: {
    libelle: 'Signalement',
    permission: 'avis.moderer',
    section: 'avis',
    slaHeures: 24,
  },
  remboursement_lead: {
    libelle: 'Contestation',
    permission: 'leads.rembourser',
    section: 'appels-d-offres',
    slaHeures: 72,
  },
  remboursement_carte_lead: {
    libelle: 'Remboursement carte',
    permission: 'finances.rembourser_carte',
    section: 'finances',
    slaHeures: 48,
  },
  lead_sans_preneur: {
    libelle: 'Sans preneur',
    permission: 'leads.prix',
    section: 'appels-d-offres',
    slaHeures: 24,
  },
  litige: { libelle: 'Litige', permission: 'litiges.traiter', section: 'litiges', slaHeures: 120 },
  contact: { libelle: 'Contact', permission: 'contacts.traiter', section: 'file', slaHeures: 24 },
  envoi_echec: {
    libelle: 'Envoi en échec',
    permission: 'contacts.traiter',
    section: 'file',
    slaHeures: 24,
  },
};

export const typeTache = (type: string): TypeTache =>
  TYPES_TACHES[type] ?? {
    libelle: type,
    permission: 'equipe.gerer',
    section: 'file',
    slaHeures: 48,
  };

/** Types que le membre peut traiter (les autres n'apparaissent pas dans sa file). */
export const peutTraiter = (type: string, permissions: readonly string[]) =>
  permissions.includes(typeTache(type).permission);

/** Couleur du SLA (maquette) : vert < 50 % du délai, orange < 100 %, rouge dépassé. */
export function etatSla(
  creeLe: number,
  type: string,
  maintenant: number,
): 'ok' | 'bientot' | 'depasse' {
  const ratio = (maintenant - creeLe) / (typeTache(type).slaHeures * 3_600_000);
  return ratio >= 1 ? 'depasse' : ratio >= 0.5 ? 'bientot' : 'ok';
}

/** Tri de la file : priorité décroissante, puis la plus ancienne d'abord. */
export const trierFile = <T extends { priorite: number; creeLe: number }>(
  taches: readonly T[],
): T[] => [...taches].sort((a, b) => b.priorite - a.priorite || a.creeLe - b.creeLe);
