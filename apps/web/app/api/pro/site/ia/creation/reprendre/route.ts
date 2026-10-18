import { entreePublierSite } from '@ph/core/schemas';
import { clientAnthropic } from '@ph/firebase/ia';
import { reprendreCreationIa } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';

/** Reprise après paiement (SITE-IA-02) : aucune question reposée. */
export const POST = routeSite('reprendreCreationIa', entreePublierSite, async (s, ctx) => {
  const cle = process.env.ANTHROPIC_API_KEY;
  return reprendreCreationIa({ ...s, client: cle ? clientAnthropic(cle) : null }, ctx);
});
