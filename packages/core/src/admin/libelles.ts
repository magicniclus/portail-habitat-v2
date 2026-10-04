/** Libellés du back-office (maquette « Admin Artisans »). */
export const LIBELLES_STATUT_ARTISAN_ADMIN = {
  en_ligne: 'En ligne',
  a_verifier: 'À vérifier',
  suspendu: 'Suspendu',
  hors_ligne: 'Hors ligne',
} as const;

export const LIBELLES_FILTRE_ARTISANS = {
  tous: 'Tous',
  en_ligne: 'En ligne',
  a_verifier: 'À vérifier',
  suspendus: 'Suspendus',
  payants: 'Payants',
} as const;

export const LIBELLES_PLAN = {
  gratuit: 'Gratuit',
  visibilite: 'Visibilité',
  premium: 'Premium',
} as const;

export const LIBELLES_ROLE_ADMIN: Record<string, string> = {
  superadmin: 'Super-administrateur',
  admin: 'Administrateur',
  moderateur: 'Modérateur',
  commercial: 'Commercial',
  finance: 'Finance',
  lecture: 'Lecture seule',
};

/** Statuts des demandes vus par l'équipe (maquette « Admin Demandes »). */
export const LIBELLES_STATUT_DEMANDE_ADMIN: Record<string, string> = {
  nouvelle: 'Nouvelle',
  en_attribution: 'Exclusive Premium',
  appel_offres: 'Appel d’offres',
  attribuee: 'Mise en relation',
  devis_recus: 'Devis reçus',
  signee: 'Signée',
  close: 'Close',
  annulee: 'Annulée',
  spam: 'Spam',
};

export const FILTRES_DEMANDES_ADMIN = {
  toutes: 'Toutes',
  attente: 'En attente',
  appel_offres: 'Appels d’offres',
  relation: 'Mise en relation',
  rejetees: 'Spam et annulées',
} as const;

/** Raisons d'exclusion du moteur, lisibles (trace de l'algorithme). */
export const LIBELLES_EXCLUSION: Record<string, string> = {
  metier: 'métier différent',
  distance: 'hors zone',
  non_verifie: 'non vérifié',
  assurance: 'décennale manquante',
  sanction: 'suspendu',
  quota: 'quota atteint',
  deja_vu: 'déjà sollicité',
  conflit: 'conflit d’intérêts',
  pause: 'en pause',
  budget: 'budget incompatible',
  score_faible: 'score insuffisant',
};

/** Raison d'exclusion lisible (`exigence:rge` → « qualification manquante : rge »). */
export const libelleExclusion = (raison: string) =>
  raison.startsWith('exigence:')
    ? `qualification manquante : ${raison.slice('exigence:'.length)}`
    : (LIBELLES_EXCLUSION[raison] ?? raison);

/** Back-office › Appels d'offres (ADMIN §2.5). */
export const FILTRES_APPELS_OFFRES_ADMIN = {
  ouverts: 'Ouverts',
  complets: 'Complets',
  termines: 'Terminés',
  tous: 'Tous',
} as const;

export const LIBELLES_STATUT_APPEL_OFFRES: Record<string, string> = {
  brouillon: 'Brouillon',
  ouvert: 'Ouvert',
  complet: 'Complet',
  clos: 'Clos',
  annule: 'Annulé',
  suspendu: 'Suspendu',
};

export const LIBELLES_MODE_PRIX = {
  auto: 'Automatique',
  manuel: 'Manuel',
  gratuit: 'Gratuit',
} as const;

export const LIBELLES_ACCES_APPEL_OFFRES = {
  tous: 'Tous les artisans',
  premium_seul: 'Premium seulement',
  premium_prioritaire: 'Premium en priorité',
} as const;

/** Lignes du détail du calcul automatique (base × coefficients). */
export const LIBELLES_DETAIL_CALCUL = {
  coefBudget: 'Budget',
  coefUrgence: 'Urgence',
  coefQualite: 'Qualité',
  coefConcurrence: 'Concurrence',
  coefNiveau: 'Niveau',
  coefEligibilite: 'Aides',
} as const;

/** Journal des imports partenaires (IMP-02) : issue et motif de rejet lisibles. */
export const LIBELLES_STATUT_IMPORT: Record<string, string> = {
  creee: 'Créée',
  doublon: 'Doublon',
  rejetee: 'Rejetée',
};
export const LIBELLES_MOTIF_REJET_IMPORT: Record<string, string> = {
  consentement_absent: 'consentement incomplet',
  telephone_invalide: 'téléphone invalide',
  hors_zone_couverte: 'hors de la zone couverte',
  doublon_30j: 'déjà reçue sous 30 jours',
  schema_invalide: 'format invalide',
};

/** Back-office › Avis : filtres et statuts (maquette « Admin Avis »). */
export const FILTRES_AVIS_ADMIN = {
  attente: 'En attente',
  risque: 'Risque élevé',
  publies: 'Publiés',
  tous: 'Tous',
} as const;
export const LIBELLES_STATUT_AVIS: Record<string, string> = {
  en_attente: 'En attente',
  publie: 'Publié',
  refuse: 'Refusé',
  retire: 'Retiré',
  suspendu: 'Suspendu',
};
