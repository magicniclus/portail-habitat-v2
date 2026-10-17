/** Données du matching (MATCHING.md), déjà lues par la Function : aucun accès Firestore ici. */
export interface Point {
  latitude: number;
  longitude: number;
}

export interface ConfigMatching {
  version: number;
  nbPropositionsInitiales: number;
  rayonMaxKm: number;
  poids: {
    competence: number;
    distance: number;
    qualite: number;
    reactivite: number;
    disponibilite: number;
    adequationBudget: number;
    completude: number;
  };
  bonusPremium: number;
  bonusVisibilite: number;
  quotaPremiumMax: number;
  garantirUnNonPremium: boolean;
  penaliteSaturation: { seuilDemandes7j: number; points: number };
  penaliteRefus: { tauxSeuil: number; points: number };
  nouvelArtisanBoost: { joursMax: number; points: number };
  scoreMin: number;
}

export interface DemandeMatching {
  id: string;
  geo: Point;
  metierRequis: string;
  intention?: string;
  exigences: readonly string[];
  budgetMinCentimes?: number;
  budgetMaxCentimes?: number;
  /** Délai souhaité en jours (null : « je me renseigne »). */
  delaiSouhaiteJours: number | null;
  /** Démarrage prévu (ms) : la décennale doit le couvrir. */
  demarrageLe: number;
  /** Réponses du simulateur en clair (« douche à l'italienne »), pour les tags. */
  motsReponses: readonly string[];
  /** Empreintes du particulier (email, téléphone, SIREN) pour le conflit d'intérêts. */
  empreintesDemandeur: readonly string[];
  artisanCibleId?: string;
}

export interface ArtisanMatching {
  id: string;
  siren: string;
  geo: Point;
  rayonKm: number;
  metierPrincipal: string;
  metiersSecondaires: readonly string[];
  intentions: readonly string[];
  tags: readonly string[];
  verifie: boolean;
  decennaleExpireLe?: number;
  /** Exigences couvertes : `rge`, `certif_diag`, `decennale`, `qualibat`… */
  qualifications: readonly string[];
  sanctionActive: boolean;
  enPause: boolean;
  demandesRecuesMois: number;
  quotaDemandesMois: number;
  /** Empreintes des membres de l'entreprise (email, téléphone) et SIREN. */
  empreintes: readonly string[];
  budgetMinCentimes?: number;
  budgetMaxCentimes?: number;
  premium: boolean;
  optionVisibilite: boolean;
  note: number;
  nbAvis: number;
  tauxRecommandation: number;
  tauxReponse: number;
  tempsReponseMoyenMin: number;
  delaiDispoJours?: number;
  completude: number;
  attributions7j: number;
  tauxRefus30j: number;
  joursDepuisVerification: number;
  /** Dernière attribution (ms), pour faire tourner à score égal. */
  derniereAttributionLe?: number;
}

export type RaisonExclusion =
  | 'metier'
  | 'distance'
  | 'non_verifie'
  | 'assurance'
  | `exigence:${string}`
  | 'sanction'
  | 'quota'
  | 'deja_vu'
  | 'conflit'
  | 'pause'
  | 'budget'
  | 'score_faible';

export interface SousScores {
  competence: number;
  distance: number;
  qualite: number;
  reactivite: number;
  disponibilite: number;
  adequationBudget: number;
  completude: number;
}

export interface Ajustements {
  premium: number;
  visibilite: number;
  saturation: number;
  refus: number;
  nouveau: number;
}

export interface Candidat {
  artisanId: string;
  siren: string;
  premium: boolean;
  distance: number;
  derniereAttributionLe?: number;
  sousScores?: SousScores;
  ajustements?: Ajustements;
  score: number;
  raisonExclusion?: RaisonExclusion;
}
