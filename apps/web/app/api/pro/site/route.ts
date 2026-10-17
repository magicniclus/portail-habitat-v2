import { entreeCreerSite } from '@ph/core/schemas';
import { siteParDefaut } from '@ph/core/sites';
import { creerSite } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';
import { ficheDuSite, paletteDepart } from '@/server/sites';

export const dynamic = 'force-dynamic';

/** Création du site de départ (sans IA) à partir de la fiche, avec son sous-domaine (DOM-01). */
export const POST = routeSite('creerSite', entreeCreerSite, async (s, ctx, e) => {
  const initial = siteParDefaut(await ficheDuSite(ctx.artisanId), paletteDepart());
  await creerSite(s, ctx, { sousDomaine: e.sousDomaine, initial });
  return null;
});
