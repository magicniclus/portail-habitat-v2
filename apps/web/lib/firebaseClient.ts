'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface ConfigPage {
  config: Record<string, string>;
  emulateurs?: { auth?: string; firestore?: string; storage?: string };
}

declare global {
  interface Window {
    __PH_FIREBASE__?: ConfigPage;
  }
}

let app: Promise<FirebaseApp> | null = null;
let authP: Promise<Auth> | null = null;
let dbP: Promise<Firestore> | null = null;

function config(): ConfigPage {
  const c = window.__PH_FIREBASE__;
  if (!c) throw new Error('Configuration Firebase absente de la page (<ConfigFirebase />).');
  return c;
}

/** SDK chargé à la demande : seulement dans l'espace pro (budget JavaScript D46). */
function application() {
  app ??= import('firebase/app').then(
    ({ getApps, initializeApp }) => getApps()[0] ?? initializeApp(config().config),
  );
  return app;
}

export function authClient(): Promise<Auth> {
  authP ??= Promise.all([application(), import('firebase/auth')]).then(([a, m]) => {
    const auth = m.getAuth(a);
    auth.languageCode = 'fr';
    const e = config().emulateurs?.auth;
    if (e) m.connectAuthEmulator(auth, `http://${e}`, { disableWarnings: true });
    return auth;
  });
  return authP;
}

/** Firestore temps réel de l'espace pro (demandes, lot 10d). @public */
export function firestoreClient(): Promise<Firestore> {
  dbP ??= Promise.all([application(), import('firebase/firestore')]).then(([a, m]) => {
    const db = m.getFirestore(a);
    const e = config().emulateurs?.firestore;
    if (e) {
      const [hote, port] = e.split(':');
      m.connectFirestoreEmulator(db, hote!, Number(port));
    }
    return db;
  });
  return dbP;
}
