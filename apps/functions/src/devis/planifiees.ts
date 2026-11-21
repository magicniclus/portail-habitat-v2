import { appAdmin } from '@ph/firebase/admin';
import { traiterDevisEnvoyes, traiterFacturesEcheances } from '@ph/firebase/devis';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/**
 * `echeancesDevisFactures` (chaque matin, 9 h) : factures « impayées » après l'échéance et relances
 * J−3, J+1, J+15 au client ; devis expirés après leur validité et relance J+7 sans réponse.
 */
export const echeancesDevisFactures = onSchedule(
  { schedule: '50 8 * * *', timeZone: 'Europe/Paris', region: REGION, timeoutSeconds: 540 },
  async () => {
    const s = { db: getFirestore(appAdmin()), horloge: Date.now, notifier };
    const factures = await traiterFacturesEcheances(s);
    const devis = await traiterDevisEnvoyes(s);
    logger.info('Échéances des devis et factures', { factures, devis });
  },
);
