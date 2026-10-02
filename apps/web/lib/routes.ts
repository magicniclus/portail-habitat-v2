import type { Route } from 'next';

/**
 * Routes du site (docs/README.md, PLAN_DEV §4). Certaines pages arrivent dans des lots
 * ultérieurs : le transtypage évite de désactiver les routes typées d'ici là.
 */
const r = (chemin: string) => chemin as Route;

export const routes = {
  accueil: r('/'),
  artisans: r('/artisans'),
  /** Annuaire avec une chaîne de requête déjà formée (`?metier=…`, `ecrireFiltresAnnuaire`). */
  annuaire: (requete: string) => r(`/artisans${requete}`),
  artisansFiltres: (filtre: { metier?: string; ville?: string }) =>
    r(`/artisans?${new URLSearchParams(filtre as Record<string, string>)}`),
  ficheArtisan: (slug: string) => r(`/artisans/${slug}`),
  connexion: r('/connexion'),
  connexionSuite: (suite: string) => r(`/connexion?suite=${encodeURIComponent(suite)}`),
  connexionPro: r('/connexion?espace=pro'),
  connexionProSuite: (suite: string) =>
    r(`/connexion?espace=pro&suite=${encodeURIComponent(suite)}`),
  proFacturation: r('/pro/facturation'),
  admin: r('/admin'),
  adminSection: (chemin: string) => r(chemin ? `/admin/${chemin}` : '/admin'),
  adminSecurite: r('/admin/securite'),
  connexionAdminSuite: (suite: string, raison?: 'inactivite' | 'expiree') =>
    r(
      `/connexion?espace=admin&suite=${encodeURIComponent(suite)}${raison ? `&raison=${raison}` : ''}`,
    ),
  /** Demander à rejoindre une entreprise déjà inscrite (COMPTES §4.4, ONB-03). */
  proRejoindre: (artisanId: string) =>
    r(`/pro/rejoindre?entreprise=${encodeURIComponent(artisanId)}`),
  /** Revendiquer une fiche créée sans propriétaire (COMPTES §3.4). */
  proRevendiquer: (artisanId: string) =>
    r(`/pro/rejoindre?revendiquer=${encodeURIComponent(artisanId)}`),
  proCompte: r('/pro/compte'),
  proFiche: r('/pro/fiche'),
  proAvis: r('/pro/avis'),
  proStatistiques: r('/pro/statistiques'),
  proEquipe: r('/pro/equipe'),
  proAbonnementPremium: r('/pro/abonnement/premium'),
  /** Page de paiement d'une offre, formule préremplie (ACQ-03). */
  proAbonnement: (produit: 'premium' | 'visibilite', facturation?: 'annuel' | 'mensuel') =>
    r(`/pro/abonnement/${produit}${facturation ? `?facturation=${facturation}` : ''}`),
  monEspace: r('/mon-espace'),
  demandeParticulier: (id: string) => r(`/mon-espace/demandes/${id}`),
  monEspaceAvis: r('/mon-espace/avis'),
  monEspaceCompte: r('/mon-espace/compte'),
  simulateur: r('/simulateur'),
  /** « Demander un devis » depuis une fiche : la demande cible cet artisan (`source: fiche_artisan`). */
  simulateurArtisan: (artisanId: string) =>
    r(`/simulateur?artisan=${encodeURIComponent(artisanId)}`),
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
