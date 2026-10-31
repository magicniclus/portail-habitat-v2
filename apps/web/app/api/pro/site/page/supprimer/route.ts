import { entreeSupprimerPage } from '@ph/core/schemas';
import { supprimerPage } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Suppression d'une page du brouillon (l'accueil reste) ; le site en ligne change à la publication. */
export const POST = routeSite('supprimerPageSite', entreeSupprimerPage, async (s, ctx, e) => {
  await supprimerPage(s, ctx, e.pageId);
  return null;
});
