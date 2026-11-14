import { entreePublierSite } from '@ph/core/schemas';
import { verifierDomaineSite } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';
import { servicesDomaines } from '@/server/sites';

export const dynamic = 'force-dynamic';

/** « Vérifier maintenant » : même contrôle que la vérification planifiée, 1 fois / 30 s. */
export const POST = routeSite('verifierDomaine', entreePublierSite, async (_s, ctx) => ({
  statut: await verifierDomaineSite(servicesDomaines(), ctx.artisanId, { manuel: true }),
}));
