import { entreeGeocoderSite } from '@ph/core/schemas';
import { geocoderAdresse } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Élément Carte : l'adresse saisie placée sur la carte (géocodage public, côté serveur). */
export const POST = routeSite('geocoderSite', entreeGeocoderSite, async (_s, _ctx, e) => ({
  lieu: await geocoderAdresse(e.adresse),
}));
