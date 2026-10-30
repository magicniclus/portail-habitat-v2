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

export const CONTENU_OFFRES: Record<FormulePayante, ContenuOffre> = {
  fiche_pro: {
    promesse: 'Soyez l’artisan qu’on appelle en premier',
    accroche:
      'Votre fiche passe devant dans votre secteur et votre numéro s’affiche : les particuliers vous contactent directement, sans intermédiaire.',
    avantages: [
      'Priorité d’affichage dans votre secteur',
      'Badge « Artisan recommandé » qui rassure au premier coup d’œil',
      'Téléphone et site visibles : on vous appelle directement',
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
      'Votre nom de domaine inclus (.fr, .com ou .eu), à votre nom',
      'IA complète : pages, textes et référencement créés pour vous',
      'Blog : 5 articles par mois, en un clic ou en pilote automatique',
      'Formulaire sur mesure et SMS à chaque demande : rappelez le premier',
      'Votre marque seule, sans la mention « Site créé avec Portail Travaux »',
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
      'Tout Fiche Pro : priorité d’affichage, badge, téléphone visible',
      'Tout Site Pro : nom de domaine, IA du site, sans mention',
      'Blog : 5 articles rédigés par l’IA chaque mois',
      'Statistiques détaillées de la fiche et du site',
    ],
    raison: 'Option payante.',
  },
  tout_inclus: {
    promesse: 'Tout Portail Travaux, avec une longueur d’avance',
    accroche:
      'Fiche, site, blog et appels d’offres : vous voyez les chantiers 12 h avant les autres et l’IA travaille deux fois plus pour vous.',
    avantages: [
      'Fiche Pro et Site Pro réunis',
      'Appels d’offres visibles 12 h avant les autres',
      '−15 % sur les appels d’offres',
      'Blog : 15 articles IA par mois, pilote jusqu’à 2 articles par semaine',
      'Quotas IA doublés sur le site et la fiche',
      'Support prioritaire',
    ],
    raison: 'Fonction incluse dans Tout inclus.',
  },
};
