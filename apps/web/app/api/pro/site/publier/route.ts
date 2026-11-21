import { entreePublierSite } from '@ph/core/schemas';
import { publierSite } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Publication (SITE-08, SITE-09) : tout lien invalide la bloque avec un message clair. */
export const POST = routeSite('publierSite', entreePublierSite, (s, ctx) => publierSite(s, ctx));
