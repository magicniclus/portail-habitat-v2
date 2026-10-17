import 'server-only';
import { appAdmin } from '@ph/firebase/admin';
import { verifierJeton, type ContenuJeton } from '@ph/firebase/notifications';
import { getFirestore } from 'firebase-admin/firestore';

/** Services des routes de notifications (Admin SDK). */
export const servicesNotifications = () => ({ db: getFirestore(appAdmin()), horloge: Date.now });

/** Secret des jetons d'email : obligatoire hors développement. */
export function secretNotifications(): string {
  const s = process.env.NOTIF_SIGNING_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('NOTIF_SIGNING_SECRET manquant.');
  return 'secret-de-developpement-local-uniquement-32';
}

export const lireJeton = (jeton: string | null | undefined): ContenuJeton | null =>
  jeton ? verifierJeton(jeton, secretNotifications(), Date.now()) : null;
