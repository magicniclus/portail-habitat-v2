import { absolue } from '@/features/vitrine/seo';

/**
 * schema.org WebApplication de l'outil Plans : gratuit (D84). Aucune note ni nombre
 * d'utilisateurs (LANDINGS §7) : seulement le nom, l'adresse, le prix nul et la catégorie.
 */
export const applicationPlans = (chemin: string, description: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Plans · Portail Travaux',
  url: absolue(chemin),
  description,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Navigateur web',
  inLanguage: 'fr-FR',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
});
