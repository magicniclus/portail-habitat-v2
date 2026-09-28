import 'server-only';
import { PROJET_EMULATEUR } from '@ph/firebase/admin';

/** Configuration publique du SDK navigateur (aucun secret : clé d'API Web, identifiants du projet). */
export interface ConfigFirebaseClient {
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    appId?: string;
    messagingSenderId?: string;
  };
  /** Émulateurs (développement, tests de bout en bout) : adresses `hôte:port`. */
  emulateurs?: { auth?: string; firestore?: string; storage?: string };
}

/**
 * Lue à l'exécution (et non à la compilation) : le même site compilé vise les émulateurs pendant les
 * tests et le vrai projet en production. Sans configuration : projet de démonstration de l'émulateur.
 */
export function configFirebaseClient(env = process.env): ConfigFirebaseClient {
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? PROJET_EMULATEUR;
  const emulateurs = {
    ...(env.FIREBASE_AUTH_EMULATOR_HOST ? { auth: env.FIREBASE_AUTH_EMULATOR_HOST } : {}),
    ...(env.FIRESTORE_EMULATOR_HOST ? { firestore: env.FIRESTORE_EMULATOR_HOST } : {}),
    ...(env.FIREBASE_STORAGE_EMULATOR_HOST ? { storage: env.FIREBASE_STORAGE_EMULATOR_HOST } : {}),
  };
  return {
    config: {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'cle-emulateur',
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
      projectId,
      ...(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        ? { storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }
        : { storageBucket: `${projectId}.appspot.com` }),
      ...(env.NEXT_PUBLIC_FIREBASE_APP_ID ? { appId: env.NEXT_PUBLIC_FIREBASE_APP_ID } : {}),
      ...(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
        ? { messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }
        : {}),
    },
    ...(Object.keys(emulateurs).length ? { emulateurs } : {}),
  };
}
