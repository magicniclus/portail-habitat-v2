import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { appAdmin } from '../../admin';
import { planifierCloudTask } from './cloudTasks';
import type { ServicesNotifications } from './notifier';
import { pousserFcm } from './push';

/** Services de `notifier()` en production : Cloud Tasks pour les envois, FCM pour le push. */
export function servicesNotifications(
  db: Firestore = getFirestore(appAdmin()),
): ServicesNotifications {
  return {
    db,
    horloge: Date.now,
    planifier: planifierCloudTask,
    pousser: pousserFcm(db, getMessaging(appAdmin())),
  };
}
