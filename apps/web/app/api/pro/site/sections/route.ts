import { entreeSectionEnregistree } from '@ph/core/schemas';
import { gererSectionsEnregistrees } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Mes sections : lues à l'ouverture du panneau Ajouter, enregistrées depuis Calques. */
export const POST = routeSite(
  'gererSectionsEnregistrees',
  entreeSectionEnregistree,
  gererSectionsEnregistrees,
  300 * 1024,
);
