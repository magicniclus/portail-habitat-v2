import type { Theme } from '@ph/ui/tokens';
import type { Route } from 'next';
import { routes } from '@/lib/routes';

export type EspacePublic = Exclude<Theme, 'admin'>;

interface Lien {
  libelle: string;
  href: Route;
}

/** Liens des pages d'erreur par espace (maquette Pages Erreur). */
export const ESPACES_ERREUR: Record<
  EspacePublic,
  { accueil: Route; mentions: Route; aide: Route; liens: Lien[] }
> = {
  particulier: {
    accueil: routes.accueil,
    mentions: routes.mentionsParticuliers,
    aide: routes.aide,
    liens: [
      { libelle: 'Trouver un artisan', href: routes.artisans },
      { libelle: 'Simulateur de devis', href: routes.simulateur },
      { libelle: 'Laisser un avis', href: routes.avis },
      { libelle: 'Aide', href: routes.aide },
    ],
  },
  pro: {
    accueil: routes.pro,
    mentions: routes.mentionsPro,
    aide: routes.proAide,
    liens: [
      { libelle: 'Mon tableau de bord', href: routes.proTableauDeBord },
      { libelle: 'Mes demandes', href: routes.proDemandes },
      { libelle: 'Appels d’offres', href: routes.proAppelsOffres },
      { libelle: 'Aide', href: routes.proAide },
    ],
  },
  diag: {
    accueil: routes.diagnostic,
    mentions: routes.mentionsParticuliers,
    aide: routes.aide,
    liens: [
      { libelle: 'Estimer mes diagnostics', href: routes.diagnosticEstimation },
      { libelle: 'Diagnostic à Cenon', href: routes.diagnosticCommune('cenon') },
      { libelle: 'Diagnostic à Lormont', href: routes.diagnosticCommune('lormont') },
      { libelle: 'Aide', href: routes.aide },
    ],
  },
};
