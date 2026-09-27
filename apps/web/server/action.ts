import 'server-only';
import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import {
  creerEnveloppe,
  type ContexteBase,
  type OptionsEnveloppe,
  type Traitement,
} from '@ph/core/enveloppe';
import type { Resultat } from '@ph/core/resultat';
import { verifierJetonAppCheck } from '@ph/firebase/admin';
import { headers } from 'next/headers';
import type { z } from '@ph/core/zod';

// Lot 2 : verifierPermission (peut()), limiterDebit, auditer et idempotence, branchés sur Firestore.
const envelopper = creerEnveloppe<ContexteBase>({
  signalerErreur: (erreur) => Sentry.captureException(erreur),
});

/** App Check n'a pas d'émulateur : `APP_CHECK_MODE=desactive` en local, jamais en production. */
function appCheckDesactive(): boolean {
  const desactive = process.env.APP_CHECK_MODE === 'desactive';
  if (desactive && process.env.VERCEL_ENV === 'production') {
    throw new Error('APP_CHECK_MODE=desactive est interdit en production.');
  }
  return desactive;
}

async function contexteRequete(): Promise<ContexteBase> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
  return {
    uid: null, // Lot 4 : lu depuis le cookie de session.
    identifiantClient: `ip:${createHash('sha256').update(ip).digest('hex').slice(0, 16)}`,
    appCheckVerifie:
      appCheckDesactive() || (await verifierJetonAppCheck(h.get('x-firebase-appcheck'))),
  };
}

/**
 * Enveloppe de toute Server Action qui écrit (ARCHITECTURE §7) :
 * `export const inviterMembre = action({ schema, permission }, async (entree, ctx) => …)`.
 * @public
 */
export function action<S extends z.ZodType, R>(
  options: OptionsEnveloppe<S>,
  traitement: Traitement<S, ContexteBase, R>,
): (brut: unknown) => Promise<Resultat<R>> {
  const executer = envelopper(options, traitement);
  return async (brut) => executer(brut, await contexteRequete());
}
