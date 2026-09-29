'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

interface ConfigPage {
  config: Record<string, string>;
  emulateurs?: { auth?: string; firestore?: string; storage?: string };
  vapid?: string;
}

let app: Promise<FirebaseApp> | null = null;
let authP: Promise<Auth> | null = null;
let dbP: Promise<Firestore> | null = null;
let stockageP: Promise<FirebaseStorage> | null = null;

function config(): ConfigPage {
  const bloc = document.getElementById('config-firebase')?.textContent;
  if (!bloc) throw new Error('Configuration Firebase absente de la page (<ConfigFirebase />).');
  return JSON.parse(bloc) as ConfigPage;
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

/** Firestore temps réel de l'espace pro (Mes demandes, PRO-01). */
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

/** Storage (documents, logo, réalisations) : la session Firebase du navigateur porte les droits. */
function stockageClient(): Promise<FirebaseStorage> {
  stockageP ??= Promise.all([application(), import('firebase/storage')]).then(([a, m]) => {
    const st = m.getStorage(a);
    const e = config().emulateurs?.storage;
    if (e) {
      const [hote, port] = e.split(':');
      m.connectStorageEmulator(st, hote!, Number(port));
    }
    return st;
  });
  return stockageP;
}

/** Dépose un fichier dans Storage (règles : membre de l'entreprise, type et taille). */
export async function deposerFichier(chemin: string, fichier: File): Promise<void> {
  await authClient().then((a) => a.authStateReady());
  const [st, m] = await Promise.all([stockageClient(), import('firebase/storage')]);
  await m.uploadBytes(m.ref(st, chemin), fichier, { contentType: fichier.type });
}

/**
 * Jeton FCM de cet appareil pour le service worker de l'espace pro (`null` si la clé VAPID
 * manque ou si le navigateur ne gère pas le push). `supprimer` : jeton renvoyé puis supprimé.
 */
export async function jetonPush(
  enregistrement: ServiceWorkerRegistration,
  supprimer = false,
): Promise<string | null> {
  const vapid = config().vapid;
  if (!vapid) return null;
  const [a, m] = await Promise.all([application(), import('firebase/messaging')]);
  if (!(await m.isSupported())) return null;
  const messaging = m.getMessaging(a);
  const jeton = await m.getToken(messaging, {
    vapidKey: vapid,
    serviceWorkerRegistration: enregistrement,
  });
  if (supprimer) await m.deleteToken(messaging);
  return jeton;
}
