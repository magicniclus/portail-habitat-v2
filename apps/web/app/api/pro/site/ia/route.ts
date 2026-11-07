import { entreeIaSite } from '@ph/core/schemas';
import { clientAnthropic } from '@ph/firebase/ia';
import { demanderIaSite } from '@ph/firebase/sites';
import { routeSite } from '@/server/routesSite';

export const dynamic = 'force-dynamic';
// Une page complète peut demander plusieurs dizaines de secondes au modèle.
export const maxDuration = 120;

/**
 * Demande à l'IA du site (IA_SITE §5) : droits et quotas revérifiés côté serveur, proposition
 * renvoyée à l'éditeur ; rien n'est enregistré dans les pages ni publié.
 */
export const POST = routeSite('demanderIaSite', entreeIaSite, async (s, ctx, e) => {
  const cle = process.env.ANTHROPIC_API_KEY;
  const { mode, reponse, ...reste } = e;
  return demanderIaSite({ ...s, client: cle ? clientAnthropic(cle) : null }, ctx, {
    ...reste,
    ...(mode ? { mode } : {}),
    ...(reponse ? { reponse } : {}),
  });
});
