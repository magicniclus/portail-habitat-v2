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
  proFacturation: r('/pro/abonnement'),
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
  /** Mon site (SITE_INTERNET §3) : `?onglet=pages|domaine|stats|formulaire`. */
  proSite: r('/pro/site'),
  proSiteOnglet: (onglet: 'pages' | 'blog' | 'domaine' | 'stats' | 'formulaire') =>
    r(`/pro/site?onglet=${onglet}`),
  /** Éditeur plein écran (SITE_INTERNET §4) sur une page. */
  proSiteEditeur: (page?: string) =>
    r(`/pro/site/editeur${page ? `?page=${encodeURIComponent(page)}` : ''}`),
  /** Éditeur d'article du blog (BLOG §3). */
  proBlogNouvelArticle: r('/pro/site/blog/nouveau'),
  proBlogArticle: (id: string) => r(`/pro/site/blog/${encodeURIComponent(id)}`),
  /** Création assistée par l'IA (`?creation=1`) ; `?ia=reprendre` au retour du paiement. */
  proSiteCreationIa: r('/pro/site/editeur?creation=1'),
  proSiteRepriseIa: r('/pro/site/editeur?ia=reprendre'),
  proDevis: r('/pro/devis'),
  proDevisNouveau: r('/pro/devis/nouveau'),
  proDevisParametres: r('/pro/devis/parametres'),
  proUnDevis: (id: string) => r(`/pro/devis/${encodeURIComponent(id)}`),
  proFactureClient: (id: string) => r(`/pro/devis/factures/${encodeURIComponent(id)}`),
  proStatistiques: r('/pro/statistiques'),
  proEquipe: r('/pro/equipe'),
  proResiliation: r('/pro/abonnement/resilier'),
  /** Mon abonnement (PAIEMENTS §4) ; `?offre=` ouvre directement le paiement de la formule. */
  proAbonnement: r('/pro/abonnement'),
  proOffre: (offre: 'fiche' | 'site' | 'pack' | 'tout', code?: string) =>
    r(`/pro/abonnement?offre=${offre}${code ? `&code=${code}` : ''}`),
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
