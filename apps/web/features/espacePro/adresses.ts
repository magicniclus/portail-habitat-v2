import type { PagePro } from '@ph/core/espace-pro';
import type { Route } from 'next';
import { routes } from '@/lib/routes';

/** Adresse de chaque page de l'espace pro (utilisable côté serveur, sans icônes). */
export const ADRESSES_PRO: Record<PagePro, Route> = {
  tableauDeBord: routes.proTableauDeBord,
  fiche: routes.proFiche,
  demandes: routes.proDemandes,
  appelsOffres: routes.proAppelsOffres,
  avis: routes.proAvis,
  statistiques: routes.proStatistiques,
  equipe: routes.proEquipe,
  facturation: routes.proFacturation,
  compte: routes.proCompte,
  aide: routes.proAide,
};
