/** Libellés du back-office Conversion (maquette « Admin Conversion »). */

export const LIBELLES_ETAPE_CYCLE: Record<string, string> = {
  prospect: 'Prospect',
  inscription_commencee: 'Inscription commencée',
  compte_cree: 'Compte créé',
  fiche_en_ligne: 'Fiche en ligne',
  gratuit_actif: 'Gratuit, fiche en ligne',
  visibilite: 'Visibilité',
  premium: 'Premium',
  resiliation_demandee: 'Résiliation demandée',
  ancien_client: 'Ancien client',
};

/** Type de trace → libellé et ton du badge. */
const LIBELLES_TRACE: Record<
  string,
  { libelle: string; tone: 'info' | 'succes' | 'attention' | 'danger' | 'neutre' }
> = {
  etape_changee: { libelle: 'Étape', tone: 'neutre' },
  email_planifie: { libelle: 'Planifié', tone: 'info' },
  email_annule: { libelle: 'Annulé', tone: 'neutre' },
  email_bloque: { libelle: 'Bloqué', tone: 'attention' },
  code_cree: { libelle: 'Code', tone: 'attention' },
  code_utilise: { libelle: 'Code utilisé', tone: 'succes' },
  code_expire: { libelle: 'Code expiré', tone: 'neutre' },
  conversion: { libelle: 'Conversion', tone: 'succes' },
  demande_offerte: { libelle: 'Demande offerte', tone: 'info' },
  demande_offerte_convertie: { libelle: 'Demande offerte reçue', tone: 'succes' },
  tache_creee: { libelle: 'Tâche', tone: 'attention' },
  action_admin: { libelle: 'Admin', tone: 'danger' },
};

export const libelleTrace = (type: string) =>
  LIBELLES_TRACE[type] ?? { libelle: type, tone: 'neutre' as const };

/** Raisons d'un non-envoi, en clair. */
export const RAISONS_NON_ENVOI: Record<string, string> = {
  temoin: 'groupe témoin',
  pression: 'pression commerciale',
  interrupteur: 'interrupteur général coupé',
  preferences: 'préférences de l’artisan',
  veille: 'mise en veille (emails non ouverts)',
  plus_valable: 'chiffres manquants',
  remise_refusee: 'remise trop récente',
  offre_non_ouverte: 'offre précédente non ouverte',
};

export const DECLENCHEURS_SEQUENCE = {
  immediat: 'Immédiat',
  delai: 'Délai (jours)',
  signal: 'Signal',
  planifie: 'Planifié',
} as const;

export const TYPES_TACHE_CONVERSION: Record<string, string> = {
  appel_commercial: 'Appel commercial',
  reponse_commerciale: 'Réponse commerciale',
  risque_resiliation: 'Risque de résiliation',
  appel_activation: 'Activation',
};
