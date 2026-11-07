import { appAdmin } from '@ph/firebase/admin';
import { agregerComportementJour } from '@ph/firebase/comportement';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';

/**
 * `comportementAgreger` (chaque nuit, 3 h) : résumés de la veille → agrégats du jour, cumuls
 * 7/30/90 jours, alertes de friction et résultats des tests A/B (COMPORTEMENT §3).
 */
export const comportementAgreger = onSchedule(
  { schedule: '0 3 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    const veille = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
      Date.now() - 86_400_000,
    );
    const bilan = await agregerComportementJour(getFirestore(appAdmin()), veille);
    logger.info('Comportement : nuit', { jour: veille, ...bilan });
  },
);
