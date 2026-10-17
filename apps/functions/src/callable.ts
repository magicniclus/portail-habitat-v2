import { createHash } from 'node:crypto';
import {
  creerEnveloppe,
  type ContexteBase,
  type OptionsEnveloppe,
  type Traitement,
} from '@ph/core/enveloppe';
import type { Resultat } from '@ph/core/resultat';
import { appAdmin } from '@ph/firebase/admin';
import { contexteDepuisJeton, dependancesEnveloppe } from '@ph/firebase/serveur';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import type { z } from '@ph/core/zod';
import { signalerErreur } from './sentry';

export const REGION = 'europe-west1';

const estEmulateur = process.env.FUNCTIONS_EMULATOR === 'true';

// Permission (peut() / admins), limite de débit, audit et idempotence : Firestore via l'Admin SDK.
const envelopper = creerEnveloppe<ContexteBase>({
  ...dependancesEnveloppe(() => getFirestore(appAdmin())),
  signalerErreur,
});

export function contexteDepuis(
  requete: Pick<CallableRequest, 'auth' | 'app' | 'rawRequest'>,
  emulateur = estEmulateur,
): ContexteBase {
  const uid = requete.auth?.uid ?? null;
  const ip = requete.rawRequest.ip ?? 'inconnue';
  return {
    ...(requete.auth?.token ? contexteDepuisJeton(requete.auth.token) : {}),
    uid,
    identifiantClient: uid ?? `ip:${createHash('sha256').update(ip).digest('hex').slice(0, 16)}`,
    // App Check n'a pas d'émulateur : en local, il est considéré comme vérifié.
    appCheckVerifie: emulateur || requete.app !== undefined,
  };
}

/** Function appelable : même enveloppe que les Server Actions, réponse `Resultat<R>`. */
export function callable<S extends z.ZodType, R>(
  options: OptionsEnveloppe<S>,
  traitement: Traitement<S, ContexteBase, R>,
) {
  const executer = envelopper(options, traitement);
  return onCall(
    { region: REGION, enforceAppCheck: !estEmulateur && options.appCheck !== false },
    (requete): Promise<Resultat<R>> => executer(requete.data, contexteDepuis(requete)),
  );
}
