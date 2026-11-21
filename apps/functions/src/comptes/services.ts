import { appAdmin } from '@ph/firebase/admin';
import type { ServicesComptes } from '@ph/firebase/comptes';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { notifier } from '../notifications/configuration';

/** Services réels des opérations de compte (Admin SDK). */
export const services = (): ServicesComptes & { urlSite: string } => ({
  urlSite: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  db: getFirestore(appAdmin()),
  auth: getAuth(appAdmin()),
  notifier,
  horloge: Date.now,
});
