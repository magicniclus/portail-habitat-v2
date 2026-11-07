import { entreePublierSite } from '@ph/core/schemas';
import { retirerDomaine } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';
import { servicesDomaines } from '@/server/sites';

export const dynamic = 'force-dynamic';

/** Retrait du domaine : le site repasse sur son adresse gratuite. */
export const POST = routeSite('retirerDomaine', entreePublierSite, async (_s, ctx) => {
  await retirerDomaine(servicesDomaines(), ctx);
  return null;
});
