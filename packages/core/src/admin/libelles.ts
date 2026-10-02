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
