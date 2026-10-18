import { entreeDomaineSite } from '@ph/core/schemas';
import { connecterDomaine } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';
import { servicesDomaines } from '@/server/sites';

export const dynamic = 'force-dynamic';

/** Connexion d'un domaine existant (DOMAINES §4, Site Pro) : tableau des enregistrements à créer. */
export const POST = routeSite('connecterDomaine', entreeDomaineSite, async (_s, ctx, e) => {
  await connecterDomaine(servicesDomaines(), ctx, e.domaine);
  return null;
});
