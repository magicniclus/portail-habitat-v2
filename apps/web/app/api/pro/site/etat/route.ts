import { entreeEtatLigneSite } from '@ph/core/schemas';
import { changerEtatLigneSite } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** En ligne, en maintenance ou retiré d'Internet (choix de l'artisan, confirmé à l'écran). */
export const POST = routeSite('etatLigneSite', entreeEtatLigneSite, async (s, ctx, e) => {
  await changerEtatLigneSite(s, ctx, e.etat);
  return null;
});
