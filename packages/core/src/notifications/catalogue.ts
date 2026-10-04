/**
 * Catalogue des envois (EMAILS.md §4) : une seule liste, lue par `notifier()`, les modèles React Email,
 * la page de préférences et l'admin. G = groupé, D = différé, S = aussi SMS, A = aussi in-app.
 */
export const CATEGORIES = [
  'securite',
  'transactionnel',
  'activite',
  'relance',
  'offres_pro',
  'marketing',
  'interne',
] as const;
export type Categorie = (typeof CATEGORIES)[number];

/** Catégories qu'aucune préférence ne peut couper (EMAILS §2). */
export const CATEGORIES_OBLIGATOIRES: readonly Categorie[] = [
  'securite',
  'transactionnel',
  'interne',
];

export type Charte = 'particulier' | 'pro' | 'diag' | 'admin' | 'destinataire';

export interface DefinitionModele {
  categorie: Categorie;
  /** `destinataire` : charte de l'espace de la personne (modèles d'authentification). */
  charte: Charte;
  sms?: true;
  inapp?: true;
  /** Relance programmée : annulée si `encoreValable` est faux au moment de l'envoi. */
  differe?: true;
  /** Attend 15 min et fusionne les événements du même type. */
  groupe?: true;
  /** Modèle rédigé (§4.1 à 4.3 et reprise du simulateur) ; les autres sont des squelettes. */
  complet?: true;
}

const s = (charte: Charte, extra: Omit<DefinitionModele, 'categorie' | 'charte'> = {}) =>
  ({ categorie: 'securite', charte, complet: true, ...extra }) as const;

export const MODELES = {
  // 4.1 Authentification et sécurité
  'lien-connexion': s('destinataire'),
  'verifier-email': s('destinataire'),
  'bienvenue-particulier': { categorie: 'transactionnel', charte: 'particulier', complet: true },
  'mot-de-passe-oublie': s('destinataire'),
  'mot-de-passe-modifie': s('destinataire'),
  'nouvel-appareil': s('destinataire'),
  'changement-email-alerte': s('destinataire'),
  'changement-email-verifier': s('destinataire'),
  '2fa-activee': s('destinataire'),
  '2fa-desactivee': s('destinataire'),
  'compte-bloque': s('destinataire'),
  'compte-suspendu': s('destinataire'),
  'compte-reactive': s('destinataire'),
  'suppression-compte-confirmee': s('destinataire'),
  'export-donnees-pret': s('destinataire'),

  // 4.2 Inscription et onboarding artisan
  'reprise-onboarding': { categorie: 'relance', charte: 'pro', complet: true },
  'relance-onboarding-1': { categorie: 'relance', charte: 'pro', differe: true, complet: true },
  'relance-onboarding-2': { categorie: 'relance', charte: 'pro', differe: true, complet: true },
  'relance-onboarding-3': { categorie: 'relance', charte: 'pro', differe: true, complet: true },
  'bienvenue-pro': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'verifier-telephone': s('pro', { sms: true }),
  'fiche-incomplete': { categorie: 'relance', charte: 'pro', differe: true, complet: true },
  'document-recu': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'document-valide': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'document-refuse': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'fiche-en-ligne': { categorie: 'transactionnel', charte: 'pro', inapp: true, complet: true },
  'revendication-code': s('pro'),
  'revendication-resultat': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'entreprise-existe-deja': s('pro'),

  // 4.3 Équipes
  'invitation-membre': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'invitation-relance': { categorie: 'relance', charte: 'pro', differe: true, complet: true },
  'invitation-acceptee': { categorie: 'activite', charte: 'pro', inapp: true, complet: true },
  'invitation-expiree': { categorie: 'activite', charte: 'pro', complet: true },
  'demande-acces': { categorie: 'transactionnel', charte: 'pro', inapp: true, complet: true },
  'demande-acces-reponse': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'role-modifie': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'membre-retire': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'transfert-propriete': s('pro'),
  'sieges-suspendus': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'entreprise-fermee': { categorie: 'transactionnel', charte: 'pro', complet: true },

  // 4.4 Particuliers
  'reprise-simulateur': { categorie: 'relance', charte: 'particulier', complet: true },
  'reprise-simulateur-rappel': { categorie: 'relance', charte: 'particulier', differe: true },
  'demande-confirmee': { categorie: 'transactionnel', charte: 'particulier' },
  /** Demande d'un site partenaire au téléphone non vérifié : lien de confirmation par SMS. */
  'confirmer-telephone': { categorie: 'transactionnel', charte: 'particulier', sms: true },
  'demande-sans-artisan': { categorie: 'transactionnel', charte: 'particulier', differe: true },
  'artisan-a-repondu': { categorie: 'activite', charte: 'particulier', inapp: true },
  'devis-recu': { categorie: 'activite', charte: 'particulier', inapp: true },
  'nouveau-message': { categorie: 'activite', charte: 'destinataire', groupe: true, inapp: true },
  'relance-devis': { categorie: 'relance', charte: 'particulier', differe: true },
  'demande-avis': { categorie: 'relance', charte: 'particulier', differe: true },
  'rappel-avis': { categorie: 'relance', charte: 'particulier', differe: true },
  'avis-recu': { categorie: 'transactionnel', charte: 'particulier' },
  'avis-publie': { categorie: 'transactionnel', charte: 'particulier' },
  'avis-refuse': { categorie: 'transactionnel', charte: 'particulier' },
  'avis-preuve-demandee': { categorie: 'transactionnel', charte: 'particulier' },
  'litige-message': { categorie: 'transactionnel', charte: 'destinataire', inapp: true },
  'litige-decision': { categorie: 'transactionnel', charte: 'destinataire', inapp: true },
  'reponse-artisan-avis': { categorie: 'activite', charte: 'particulier' },
  'dossier-diag-confirme': { categorie: 'transactionnel', charte: 'diag' },
  'compte-inactif': { categorie: 'transactionnel', charte: 'particulier', differe: true },

  // 4.5 Artisans, activité
  'nouvelle-demande': { categorie: 'transactionnel', charte: 'pro', sms: true, inapp: true },
  'relance-demande': { categorie: 'activite', charte: 'pro', differe: true },
  'demande-expiree': { categorie: 'activite', charte: 'pro', inapp: true },
  'devis-accepte': { categorie: 'activite', charte: 'pro', inapp: true },
  'devis-refuse': { categorie: 'activite', charte: 'pro', inapp: true },
  'nouvel-appel-offres': { categorie: 'activite', charte: 'pro', inapp: true },
  'resume-appels-offres': { categorie: 'activite', charte: 'pro' },
  'lead-debloque': { categorie: 'transactionnel', charte: 'pro' },
  'credits-faibles': { categorie: 'activite', charte: 'pro' },
  'credits-expirent': { categorie: 'activite', charte: 'pro', differe: true },
  'remboursement-lead': { categorie: 'transactionnel', charte: 'pro' },
  'nouvel-avis': { categorie: 'activite', charte: 'pro', inapp: true },
  'avis-signale-decision': { categorie: 'transactionnel', charte: 'pro' },
  'assurance-expire': { categorie: 'transactionnel', charte: 'pro', sms: true },
  'rapport-hebdo': { categorie: 'activite', charte: 'pro' },
  'rapport-mensuel': { categorie: 'offres_pro', charte: 'pro' },
  'avertissement-charte': { categorie: 'transactionnel', charte: 'pro' },
  suspension: { categorie: 'transactionnel', charte: 'pro' },
  'levee-sanction': { categorie: 'transactionnel', charte: 'pro' },

  // 4.6 Facturation
  'abonnement-active': { categorie: 'transactionnel', charte: 'pro', complet: true },
  recu: { categorie: 'transactionnel', charte: 'pro', complet: true },
  'paiement-echoue': { categorie: 'transactionnel', charte: 'pro', differe: true, complet: true },
  renouvellement: { categorie: 'transactionnel', charte: 'pro', complet: true },
  'abonnement-resilie': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'abonnement-termine': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'pack-achete': { categorie: 'transactionnel', charte: 'pro', complet: true },
  'moyen-paiement-expire': { categorie: 'transactionnel', charte: 'pro', differe: true },

  // 4.7 Conversion (CONVERSION.md)
  'prospect-estimation': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prospect-demande-zone': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prospect-temoignage': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prospect-derniere': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'resume-zone-mensuel': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'vis-position': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'vis-concurrents': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'vis-recherches-manquees': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'vis-offre-lancement': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'vis-offre-rappel': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'vis-offre-relance': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'vis-demande-offerte': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prem-bilan-visibilite': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prem-demandes-manquees': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prem-credits': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prem-appel-offres-complet': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'prem-renouvellement': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'passage-annuel': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'garantie-tenue': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'resiliation-alternative': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'reconquete-1': { categorie: 'offres_pro', charte: 'pro', differe: true },
  'reconquete-2': { categorie: 'offres_pro', charte: 'pro', differe: true },

  // 4.8 Internes
  'resume-file': { categorie: 'interne', charte: 'admin' },
  'alerte-urgente': { categorie: 'interne', charte: 'admin' },
  'rgpd-demande': { categorie: 'interne', charte: 'admin' },
  'invitation-equipe-admin': { categorie: 'transactionnel', charte: 'admin' },
  'ia-synthese-hebdo': { categorie: 'interne', charte: 'admin' },
  'alerte-budget': { categorie: 'interne', charte: 'admin' },
} as const satisfies Record<string, DefinitionModele>;

export type NomModele = keyof typeof MODELES;

export const estModele = (nom: string): nom is NomModele => Object.hasOwn(MODELES, nom);

export function definition(nom: NomModele): DefinitionModele {
  return MODELES[nom];
}
