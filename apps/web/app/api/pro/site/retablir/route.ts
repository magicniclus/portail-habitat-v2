import { entreeVersionSite } from '@ph/core/schemas';
import { retablirVersion } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Remise en ligne d'une version (SITE-08, < 10 s) ; le brouillon n'est pas touché. */
export const POST = routeSite('retablirVersionSite', entreeVersionSite, async (s, ctx, e) => {
  await retablirVersion(s, ctx, e.version);
  return null;
});
