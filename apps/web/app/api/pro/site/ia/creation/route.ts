import { entreeCreationIa } from '@ph/core/schemas';
import { clientAnthropic } from '@ph/firebase/ia';
import { demarrerCreationIa } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';
import { ficheCreation } from '@/server/sites';

export const dynamic = 'force-dynamic';

const client = () =>
  process.env.ANTHROPIC_API_KEY ? clientAnthropic(process.env.ANTHROPIC_API_KEY) : null;

/** Début de la création assistée : fiche relue côté serveur, réponses gardées pour la reprise. */
export const POST = routeSite('demarrerCreationIa', entreeCreationIa, async (s, ctx, e) =>
  demarrerCreationIa({ ...s, client: client() }, ctx, {
    reponses: e.reponses,
    fiche: await ficheCreation(ctx.artisanId),
  }),
);
