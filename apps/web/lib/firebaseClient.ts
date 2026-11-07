'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { posterJson } from './posterJson';

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

/**
 * Firestore temps réel de l'espace pro (Mes demandes, PRO-01). Connexion en « long polling »
 * (requêtes XHR) plutôt qu'en flux `fetch` : à la fermeture d'une écoute (changement de page,
 * rechargement), le flux `fetch` était interrompu sans que le SDK rattrape l'erreur
 * (« Uncaught (in promise) AbortError: signal is aborted without reason », webchannel_blob).
 * Même rendu pour l'utilisateur ; les écoutes de l'espace pro sont rares et peu volumineuses.
 */
export function firestoreClient(): Promise<Firestore> {
  dbP ??= Promise.all([application(), import('firebase/firestore')]).then(([a, m]) => {
    let db: Firestore;
    try {
      db = m.initializeFirestore(a, { experimentalForceLongPolling: true });
    } catch {
      // Déjà initialisé (rechargement à chaud en développement) : on reprend l'instance.
      db = m.getFirestore(a);
    }
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

/** Échec d'un envoi, avec un message compréhensible (affiché tel quel à l'artisan). */
export class EnvoiImpossible extends Error {}

const MESSAGES_ENVOI: Record<string, string> = {
  'storage/unauthorized':
    'Envoi refusé : votre compte n’a pas le droit de modifier cette fiche (reconnectez-vous ; seuls le propriétaire et le gérant peuvent).',
  'storage/unauthenticated': 'Session expirée : reconnectez-vous puis réessayez.',
  'storage/quota-exceeded': 'Espace de stockage plein : contactez le support.',
  'storage/retry-limit-exceeded':
    'Le serveur de fichiers ne répond pas : réessayez dans un instant.',
  'storage/canceled': 'Envoi annulé.',
};

/**
 * Dépose un fichier dans Storage (règles : membre de l'entreprise, type et taille). Jamais
 * d'attente sans fin : au bout de `delaiMs`, l'envoi est annulé avec un message clair ; un refus
 * des règles ou une session expirée donnent leur vraie raison.
 */
export async function deposerFichier(
  chemin: string,
  fichier: File,
  delaiMs = 120_000,
): Promise<void> {
  const auth = await authClient();
  await auth.authStateReady();
  // Session des fichiers absente (connexion ouverte seulement côté serveur) : dépôt par le serveur.
  if (!auth.currentUser) return deposerParServeur(chemin, fichier);
  try {
    await envoyer(chemin, fichier, delaiMs);
  } catch (e) {
    if ((e as { code?: string }).code !== 'storage/unauthorized') throw versMessage(e);
    // Droits de la session périmés (entreprise créée ou rôle changé depuis la connexion) :
    // recalculés côté serveur, session renouvelée, puis un seul nouvel essai.
    await posterJson('/api/pro/compte/droits', {}).catch(() => undefined);
    await auth.currentUser.getIdToken(true).catch(() => undefined);
    try {
      await envoyer(chemin, fichier, delaiMs);
    } catch (e2) {
      if ((e2 as { code?: string }).code !== 'storage/unauthorized') throw versMessage(e2);
      // Toujours refusé (règles croisées Storage → Firestore indisponibles, émulateur…) : le
      // serveur vérifie lui-même le droit, le type et la taille, puis dépose le fichier.
      await deposerParServeur(chemin, fichier);
    }
  }
}

async function deposerParServeur(chemin: string, fichier: File) {
  const corps = new FormData();
  corps.set('chemin', chemin);
  corps.set('fichier', fichier);
  let r: Response;
  try {
    r = await fetch('/api/pro/fichiers', { method: 'POST', body: corps });
  } catch {
    throw new EnvoiImpossible('Le serveur ne répond pas : vérifiez votre connexion et réessayez.');
  }
  if (r.status === 413) throw new EnvoiImpossible('Fichier trop lourd pour être envoyé.');
  const res = (await r.json().catch(() => null)) as { ok: boolean; message?: string } | null;
  if (!res?.ok)
    throw new EnvoiImpossible(
      r.status === 401 || r.status === 403
        ? 'Envoi refusé : reconnectez-vous puis réessayez (seuls le propriétaire et le gérant peuvent modifier la fiche).'
        : (res?.message ?? 'L’envoi n’a pas abouti. Réessayez.'),
    );
}

async function envoyer(chemin: string, fichier: File, delaiMs: number) {
  const [st, m] = await Promise.all([stockageClient(), import('firebase/storage')]);
  const tache = m.uploadBytesResumable(m.ref(st, chemin), fichier, { contentType: fichier.type });
  const minuterie = setTimeout(() => tache.cancel(), delaiMs);
  try {
    await tache;
  } finally {
    clearTimeout(minuterie);
  }
}

function versMessage(e: unknown): EnvoiImpossible {
  const code = (e as { code?: string }).code ?? '';
  return new EnvoiImpossible(
    code === 'storage/canceled'
      ? 'Le serveur de fichiers ne répond pas (envoi trop long). Vérifiez votre connexion ou que le stockage est démarré, puis réessayez.'
      : (MESSAGES_ENVOI[code] ??
          `L’envoi n’a pas abouti (${code || 'erreur inconnue'}). Réessayez.`),
  );
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

/**
 * Prise du Studio (vidéo ou voix, jusqu'à 100 Mo) envoyée directement dans Storage, avec
 * l'avancement. Droits périmés (permission Studio ajoutée depuis la connexion) : la session est
 * renouvelée puis un seul nouvel essai. Pas de dépôt par le serveur : fichiers trop lourds.
 */
export async function deposerPrise(
  chemin: string,
  fichier: Blob,
  avancement: (fraction: number) => void,
): Promise<void> {
  const auth = await authClient();
  await auth.authStateReady();
  if (!auth.currentUser)
    throw new EnvoiImpossible(
      'Session expirée : déconnectez-vous puis reconnectez-vous à l’admin.',
    );
  const [st, m] = await Promise.all([stockageClient(), import('firebase/storage')]);
  const essai = () =>
    new Promise<void>((ok, ko) => {
      const tache = m.uploadBytesResumable(m.ref(st, chemin), fichier, {
        contentType: fichier.type.split(';')[0] || 'video/webm',
      });
      tache.on(
        'state_changed',
        (s) => avancement(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
        ko,
        () => ok(),
      );
    });
  try {
    await essai();
  } catch (e) {
    if ((e as { code?: string }).code !== 'storage/unauthorized') throw versMessage(e);
    await auth.currentUser.getIdToken(true).catch(() => undefined);
    try {
      await essai();
    } catch (e2) {
      if ((e2 as { code?: string }).code === 'storage/unauthorized')
        throw new EnvoiImpossible(
          'Envoi refusé : la permission Studio n’est pas encore dans votre session. Lancez « pnpm admin:permissions », puis reconnectez-vous.',
        );
      throw versMessage(e2);
    }
  }
}

/** Adresse de lecture d'un fichier du Studio (règles : section Studio). */
export async function urlFichierStudio(chemin: string): Promise<string> {
  const [st, m] = await Promise.all([stockageClient(), import('firebase/storage')]);
  return m.getDownloadURL(m.ref(st, chemin));
}
