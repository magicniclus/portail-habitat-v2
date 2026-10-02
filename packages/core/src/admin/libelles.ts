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
