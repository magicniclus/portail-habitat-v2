import { entreeDomaineSite } from '@ph/core/schemas';
import { choisirDomaine } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';
import { servicesAchatDomaine } from '@/server/sites';

export const dynamic = 'force-dynamic';

/**
 * Achat en un clic (DOMAINES §3) : avec Site Pro, commande immédiate au nom de l'entreprise ;
 * sinon le domaine est mis de côté et commandé par le webhook Stripe après le paiement.
 */
export const POST = routeSite('acheterDomaine', entreeDomaineSite, async (_s, ctx, e) =>
  choisirDomaine(servicesAchatDomaine(), ctx, e.domaine),
);
