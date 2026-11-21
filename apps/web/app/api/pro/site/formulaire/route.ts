import { entreeChampsSite } from '@ph/core/schemas';
import { enregistrerFormulaire } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Champs du formulaire (Site Pro seulement, refusé sinon côté serveur, SITE-13). */
export const POST = routeSite('enregistrerFormulaireSite', entreeChampsSite, async (s, ctx, e) => {
  await enregistrerFormulaire(s, ctx, e.champs);
  return null;
});
