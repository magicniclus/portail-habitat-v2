import { appAdmin, bucketFichiers } from '@ph/firebase/admin';
import { purgerCorbeilleDessin } from '@ph/firebase/dessin';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';

/**
 * `purgeDessinNuit` (chaque nuit, 3 h 40) : plans Dessin à la corbeille depuis plus de 30 jours,
 * avec leurs versions et leurs fichiers (DESSIN.md §4). 200 plans par passage au plus.
 */
export const purgeDessinNuit = onSchedule(
  { schedule: '40 3 * * *', timeZone: 'Europe/Paris', region: REGION, timeoutSeconds: 540 },
  async () => {
    const s = { db: getFirestore(appAdmin()), bucket: bucketFichiers(), horloge: Date.now };
    logger.info('Purge de la corbeille Dessin', await purgerCorbeilleDessin(s));
  },
);
