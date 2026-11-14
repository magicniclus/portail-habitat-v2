import { entreePageCreationIa } from '@ph/core/schemas';
import { clientAnthropic } from '@ph/firebase/ia';
import { genererPageCreation } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Une page de la création (accueil d'abord) : proposition validée, jamais publiée. */
export const POST = routeSite('genererPageCreation', entreePageCreationIa, async (s, ctx, e) => {
  const cle = process.env.ANTHROPIC_API_KEY;
  return genererPageCreation({ ...s, client: cle ? clientAnthropic(cle) : null }, ctx, e.cle);
});
