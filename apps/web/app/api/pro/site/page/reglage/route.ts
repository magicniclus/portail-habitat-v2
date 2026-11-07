import { entreeReglagePage } from '@ph/core/schemas';
import { reglerPage } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Tableau de bord : page dans le menu, en ligne ou en brouillon ; effet à la publication. */
export const POST = routeSite('reglerPageSite', entreeReglagePage, async (s, ctx, e) => {
  await reglerPage(s, ctx, e);
  return null;
});
