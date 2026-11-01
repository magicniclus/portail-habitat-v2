import type { FormulePayante } from './droits';

/**
 * Contenu de la fenêtre d'offre (maquette Fenetre Offre, PAIEMENTS §4) : une promesse courte, ce
 * que l'offre change pour l'artisan, puis ses avantages concrets. Que des faits du catalogue
 * (PAIEMENTS §1) : aucun chiffre de résultat inventé.
 */
export interface ContenuOffre {
  /** Titre court, du point de vue de l'artisan. */
  promesse: string;
  accroche: string;
  avantages: readonly string[];
  /** Raison affichée si l'écran appelant n'en donne pas. */
  raison: string;
  note?: string;
}

/** Label des entreprises qui ont la visibilité Fiche Pro (`droits.badgeRecommande`, webhook). */
export const LABEL_PREMIUM = 'Premium Portail Travaux';

export const CONTENU_OFFRES: Record<FormulePayante, ContenuOffre> = {
  fiche_pro: {
    promesse: 'Soyez l’artisan qu’on appelle en premier',
    accroche:
      'Votre fiche passe devant dans votre secteur et votre numéro s’affiche : les particuliers vous contactent directement, sans intermédiaire.',
    avantages: [
      'Mis en avant sur Portail Travaux : en tête de votre secteur',
      `Label « ${LABEL_PREMIUM} » sur votre fiche et dans l’annuaire`,
      'Votre téléphone et votre site visibles : on vous appelle directement',
      'Photos et réalisations illimitées pour montrer votre travail',
      'Statistiques détaillées : vues, appels et demandes de devis',
    ],
    raison: 'Option payante.',
    note: 'Vous voulez aussi Site Pro ? Fiche + Site regroupe les deux à 34,90 € HT.',
  },
  site_pro: {
    promesse: 'Un vrai site à votre nom, sans y passer vos soirées',
    accroche:
      'Votre nom de domaine, un site qui inspire confiance, et l’IA qui écrit à votre place : vous gardez votre temps pour vos chantiers.',
    avantages: [
      'Site internet créé et optimisé pour Google par l’IA : pages, textes, référencement',
      'Votre nom de domaine inclus (.fr, .com ou .eu), à votre nom',
      'Blog : 5 articles par mois, en un clic ou en pilote automatique',
      'Formulaire sur mesure et SMS à chaque demande : rappelez le premier',
      'Votre marque seule, sans la mention « Propulsé par Portail Travaux »',
      'Statistiques sur 12 mois et Search Console',
    ],
    raison: 'Fonction incluse dans Site Pro.',
    note: 'Vous avez déjà Fiche Pro ? Fiche + Site regroupe les deux à 34,90 € HT.',
  },
  pack_fiche_site: {
    promesse: 'Visible partout, au meilleur prix',
    accroche:
      'Votre fiche en tête de votre secteur et votre site à votre nom, réunis : 4 € de moins par mois que séparément.',
    avantages: [
      'Mis en avant sur Portail Travaux : en tête de votre secteur',
      `Label « ${LABEL_PREMIUM} » sur votre fiche et dans l’annuaire`,
      'Votre téléphone et votre site visibles',
      'Site internet optimisé pour Google par l’IA, nom de domaine inclus',
      'Blog : 5 articles rédigés par l’IA chaque mois',
      'Statistiques détaillées de la fiche et du site',
    ],
    raison: 'Option payante.',
  },
  tout_inclus: {
    promesse: 'Tout Portail Travaux, avec une longueur d’avance',
    accroche:
      'Le maximum d’occasions de chantiers : en tête de votre secteur, un site optimisé par l’IA et les appels d’offres avant les autres.',
    avantages: [
      'Mis en avant sur Portail Travaux : en tête de votre secteur',
      `Label « ${LABEL_PREMIUM} » sur votre fiche et dans l’annuaire`,
      'Votre téléphone et votre site visibles : on vous appelle directement',
      'Site internet optimisé pour Google par l’IA, nom de domaine inclus',
      'Appels d’offres visibles 12 h avant les autres artisans',
      '−15 % sur chaque appel d’offres',
      'Blog : 15 articles IA par mois, en pilote automatique',
      'Quotas IA doublés et support prioritaire',
    ],
    raison: 'Fonction incluse dans Tout inclus.',
  },
};
