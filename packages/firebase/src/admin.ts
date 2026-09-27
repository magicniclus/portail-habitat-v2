import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';

/** Projet utilisé par les émulateurs : le préfixe « demo- » interdit tout appel à un vrai projet. */
export const PROJET_EMULATEUR = 'demo-portail-habitat';

export function estEmulateur(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FUNCTIONS_EMULATOR,
  );
}

/** Application Admin unique, côté serveur uniquement (site et Functions). */
export function appAdmin(env: NodeJS.ProcessEnv = process.env): App {
  if (getApps().length) return getApp();
  if (estEmulateur(env)) {
    return initializeApp({ projectId: env.GCLOUD_PROJECT ?? PROJET_EMULATEUR });
  }
  if (env.FIREBASE_ADMIN_CLIENT_EMAIL && env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  // Sur Google Cloud (Functions), les identifiants viennent de l'environnement.
  return initializeApp();
}

/** Vérifie un jeton App Check envoyé par le navigateur (en-tête `X-Firebase-AppCheck`). */
export async function verifierJetonAppCheck(jeton: string | null | undefined): Promise<boolean> {
  if (!jeton) return false;
  try {
    await getAppCheck(appAdmin()).verifyToken(jeton);
    return true;
  } catch {
    return false;
  }
}
