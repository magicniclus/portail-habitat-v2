import { appAdmin } from '@ph/firebase/admin';
import type { ServicesComptes } from '@ph/firebase/comptes';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { notifierProvisoire } from '../notifications/provisoire';

/** Services réels des opérations de compte (Admin SDK). */
export const services = (): ServicesComptes => ({
  db: getFirestore(appAdmin()),
  auth: getAuth(appAdmin()),
  notifier: notifierProvisoire,
  horloge: Date.now,
});
