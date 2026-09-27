import type { Route } from 'next';

/**
 * Routes du site (docs/README.md, PLAN_DEV §4). Certaines pages arrivent dans des lots
 * ultérieurs : le transtypage évite de désactiver les routes typées d'ici là.
 */
const r = (chemin: string) => chemin as Route;

export const routes = {
  accueil: r('/'),
  artisans: r('/artisans'),
  simulateur: r('/simulateur'),
  avis: r('/avis'),
  aide: r('/aide'),
  mentionsParticuliers: r('/legal/particuliers/mentions'),
  mentionsPro: r('/legal/pro/mentions'),
  pro: r('/pro'),
  proTableauDeBord: r('/pro/tableau-de-bord'),
  proDemandes: r('/pro/demandes'),
  proAppelsOffres: r('/pro/appels-d-offres'),
  proAide: r('/pro/aide'),
  diagnostic: r('/diagnostic-immobilier'),
  diagnosticEstimation: r('/diagnostic-immobilier/estimation'),
  diagnosticCommune: (slug: string) => r(`/diagnostic-immobilier/${slug}`),
  etatDuService: r('/aide?sujet=etat-du-service'),
} as const;
