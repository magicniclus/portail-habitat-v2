import type { FormulePayante } from './droits';

/** Contenu de la fenêtre d'offre (maquette Fenetre Offre, PAIEMENTS §4). */
export interface ContenuOffre {
  accroche: string;
  avantages: readonly string[];
  /** Raison affichée si l'écran appelant n'en donne pas. */
  raison: string;
  note?: string;
}

export const CONTENU_OFFRES: Record<FormulePayante, ContenuOffre> = {
  fiche_pro: {
    accroche:
      'Votre fiche passe devant dans votre secteur et les particuliers vous appellent directement.',
    avantages: [
      'Priorité d’affichage dans votre secteur',
      'Badge « Artisan recommandé »',
      'Photos et réalisations illimitées',
      'Téléphone et site visibles sur votre fiche',
      'Statistiques détaillées',
    ],
    raison: 'Option payante.',
    note: 'Vous voulez aussi Site Pro ? Fiche + Site regroupe les deux à 34,90 € HT.',
  },
  site_pro: {
    accroche: 'Votre site à votre nom, et l’IA fait le travail à votre place.',
    avantages: [
      'Votre nom de domaine inclus (.fr, .com ou .eu)',
      'IA complète : création du site, pages, textes et référencement',
      'Blog : 5 articles par mois, en un clic ou en pilote automatique',
      'Formulaire sur mesure et SMS à chaque demande',
      'Sans la mention « Site créé avec Portail Habitat »',
      'Statistiques sur 12 mois et Search Console',
    ],
    raison: 'Fonction incluse dans Site Pro.',
    note: 'Vous avez déjà Fiche Pro ? Fiche + Site regroupe les deux à 34,90 € HT.',
  },
  pack_fiche_site: {
    accroche: 'Fiche Pro et Site Pro réunis, 4 € moins cher que séparément.',
    avantages: [
      'Tout Fiche Pro : priorité, badge, téléphone visible',
      'Tout Site Pro : domaine, IA du site, sans mention',
      'Blog : 5 articles IA par mois',
      'Statistiques détaillées fiche et site',
    ],
    raison: 'Option payante.',
  },
  tout_inclus: {
    accroche: 'Tout Portail Habitat, avec des quotas IA doublés.',
    avantages: [
      'Fiche Pro et Site Pro réunis',
      'Blog : 15 articles IA par mois, pilote jusqu’à 2 articles par semaine',
      'Quotas IA doublés sur le site et la fiche',
      '−15 % sur les appels d’offres',
      'Appels d’offres visibles 12 h avant les autres',
      'Support prioritaire',
    ],
    raison: 'Fonction incluse dans Tout inclus.',
  },
};
