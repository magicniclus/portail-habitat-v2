import { entreeSuiviSite } from '@ph/core/schemas';
import { enregistrerSuivi } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Balise Google et pixel Meta du site (identifiants validés ; actifs derrière le consentement). */
export const POST = routeSite('enregistrerSuiviSite', entreeSuiviSite, async (s, ctx, e) => {
  await enregistrerSuivi(s, ctx, e.suivi);
  return { enregistre: true };
});
