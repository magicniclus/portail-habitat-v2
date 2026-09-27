import { createHash, randomBytes } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

/** Message à envoyer : branché sur `notifier()` (EMAILS.md) ; les tests le remplacent par un espion. */
export interface Notification {
  modele: string;
  destinataire: { email?: string; uid?: string; artisanId?: string };
  donnees: Record<string, unknown>;
  cleIdempotence: string;
}
export type Notifier = (n: Notification) => Promise<void>;

/** Services injectés dans chaque opération de compte (testables sur émulateur). */
export interface ServicesComptes {
  db: Firestore;
  auth: Auth;
  notifier: Notifier;
  horloge: () => number;
  /** Jeton aléatoire (invitations, liens) : 32 octets en base64url. */
  jeton?: () => string;
}

export const nouveauJeton = () => randomBytes(32).toString('base64url');

/** Seule l'empreinte d'un jeton est stockée (COMPTES §4.2). */
export const empreinteJeton = (jeton: string) => createHash('sha256').update(jeton).digest('hex');

export const JOUR_MS = 86_400_000;
