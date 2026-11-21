import { entreeNavigationSite } from '@ph/core/schemas';
import { enregistrerNavigation } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Navigation globale, enregistrée à part (SITE-11) : le contenu des pages n'est pas touché. */
export const POST = routeSite(
  'enregistrerNavigationSite',
  entreeNavigationSite,
  async (s, ctx, e) => {
    await enregistrerNavigation(s, ctx, e.navigation);
    return null;
  },
);
