import { entreeSousDomaine } from '@ph/core/schemas';
import { changerSousDomaine } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Changement du sous-domaine gratuit : l'ancien est libéré dans la même transaction. */
export const POST = routeSite('changerSousDomaine', entreeSousDomaine, async (s, ctx, e) => {
  await changerSousDomaine(s, ctx, e.sousDomaine);
  return null;
});
