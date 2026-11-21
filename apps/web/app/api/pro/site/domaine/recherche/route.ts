import { entreeRechercheDomaine } from '@ph/core/schemas';
import { rechercherDomaines } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';
import { servicesAchatDomaine } from '@/server/sites';

export const dynamic = 'force-dynamic';

/** Recherche d'un domaine à acheter (DOMAINES §3) : suggestions et disponibilité. */
export const POST = routeSite('rechercherDomaine', entreeRechercheDomaine, async (_s, ctx, e) => ({
  resultats: await rechercherDomaines(servicesAchatDomaine(), ctx, e.requete),
}));
