import { entreePublierSite } from '@ph/core/schemas';
import { ficheDuSite } from '@/server/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Données de la fiche pour « Appliquer à tout le site » (SITE_INTERNET §4.7), lues à l'ouverture des modèles. */
export const POST = routeSite('lireFicheSite', entreePublierSite, (_s, ctx) =>
  ficheDuSite(ctx.artisanId),
);
