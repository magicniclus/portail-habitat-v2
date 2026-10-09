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
import { appAdmin, verifierJetonAppCheck } from '@ph/firebase/admin';
import {
  COOKIE_SESSION,
  contexteDepuisJeton,
  dependancesEnveloppe,
  lireSession,
} from '@ph/firebase/serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { cookies, headers } from 'next/headers';
import { COOKIE_APP_CHECK } from '@/lib/appCheckCookie';
import type { z } from '@ph/core/zod';

// Permission (peut() / admins), limite de débit, audit et idempotence : Firestore via l'Admin SDK.
const envelopper = creerEnveloppe<ContexteBase>({
  ...dependancesEnveloppe(() => getFirestore(appAdmin())),
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
  // Cookie vérifié avec les révocations : un membre retiré perd l'accès immédiatement.
  const pot = await cookies();
  const session = await lireSession(pot.get(COOKIE_SESSION)?.value);
  return {
    ...(session ? contexteDepuisJeton(session) : { uid: null }),
    identifiantClient:
      session?.uid ?? `ip:${createHash('sha256').update(ip).digest('hex').slice(0, 16)}`,
    appCheckVerifie:
      appCheckDesactive() ||
      // En-tête (appels fetch) ou cookie posé par le navigateur (Server Actions, sans en-tête).
      (await verifierJetonAppCheck(
        h.get('x-firebase-appcheck') ?? pot.get(COOKIE_APP_CHECK)?.value,
      )),
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

/**
 * Enveloppe des envois de mesure du comportement (`/api/t`, COMPORTEMENT §3) : ni session ni
 * App Check (un `sendBeacon` ne porte pas d'en-tête), client identifié par l'IP hachée avec un
 * sel du jour (jamais d'IP en clair).
 */
export function actionMesure<S extends z.ZodType, R>(
  options: OptionsEnveloppe<S>,
  traitement: Traitement<S, ContexteBase, R>,
): (brut: unknown) => Promise<Resultat<R>> {
  const executer = envelopper(
    { ...options, authentification: 'facultative', appCheck: false },
    traitement,
  );
  return async (brut) => {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
    const sel = `${process.env.COMPORTEMENT_SALT_SECRET ?? 'local'}:${new Date().toISOString().slice(0, 10)}`;
    const empreinte = createHash('sha256').update(`${sel}:${ip}`).digest('hex').slice(0, 16);
    return executer(brut, {
      uid: null,
      identifiantClient: `ip:${empreinte}`,
      appCheckVerifie: false,
    });
  };
}
