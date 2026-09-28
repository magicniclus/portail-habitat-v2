import type { Route } from 'next';

/**
 * Routes du site (docs/README.md, PLAN_DEV §4). Certaines pages arrivent dans des lots
 * ultérieurs : le transtypage évite de désactiver les routes typées d'ici là.
 */
const r = (chemin: string) => chemin as Route;

export const routes = {
  accueil: r('/'),
  artisans: r('/artisans'),
  artisansFiltres: (filtre: { metier?: string; ville?: string }) =>
    r(`/artisans?${new URLSearchParams(filtre as Record<string, string>)}`),
  ficheArtisan: (slug: string) => r(`/artisans/${slug}`),
  connexion: r('/connexion'),
  connexionPro: r('/connexion?espace=pro'),
  monEspace: r('/mon-espace'),
  demandeParticulier: (id: string) => r(`/mon-espace/demandes/${id}`),
  simulateur: r('/simulateur'),
  avis: r('/avis'),
  aide: r('/aide'),
  aideSujet: (sujet: string) => r(`/aide?sujet=${sujet}`),
  legal: (public_: 'particuliers' | 'pro', doc: string) => r(`/legal/${public_}/${doc}`),
  mentionsParticuliers: r('/legal/particuliers/mentions'),
  mentionsPro: r('/legal/pro/mentions'),
  proOffres: r('/pro#offres'),
  proInscription: r('/pro#inscription'),
  pro: r('/pro'),
  proTableauDeBord: r('/pro/tableau-de-bord'),
  proDemandes: r('/pro/demandes'),
  proAppelsOffres: r('/pro/appels-d-offres'),
  proAide: r('/pro/aide'),
  diagnostic: r('/diagnostic-immobilier'),
  diagnosticEstimation: r('/diagnostic-immobilier/estimation'),
  diagnosticEstimationCommune: (slug: string) =>
    r(`/diagnostic-immobilier/estimation?ville=${slug}`),
  diagnosticCommune: (slug: string) => r(`/diagnostic-immobilier/${slug}`),
  etatDuService: r('/aide?sujet=etat-du-service'),
} as const;
