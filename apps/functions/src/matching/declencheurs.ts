import { appAdmin } from '@ph/firebase/admin';
import { attribuerDemande, calculerScoresNuit, relancerMatching } from '@ph/firebase/matching';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/**
 * Nouvelle demande (MATCHING, D41) : attribution au meilleur Premium qui a du quota, sinon appel
 * d'offres. Rejouable sans double effet (la demande n'est traitée que si elle est `nouvelle`).
 */
const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now, notifier });

export const attribuerNouvelleDemande = onDocumentCreated(
  { document: 'demandes/{demandeId}', region: REGION, retry: true },
  async (evenement) => {
    const demandeId = evenement.params.demandeId;
    const resultat = await attribuerDemande(services(), demandeId);
    // Identifiant et résultat seulement : aucune donnée personnelle dans les journaux.
    logger.info('Attribution', { demandeId, resultat });
  },
);

/** `matchingRelance` (MATCHING [7]) : expirations, conversions en appel d'offres, sans preneur. */
export const matchingRelance = onSchedule(
  { schedule: 'every 15 minutes', region: REGION, timeZone: 'Europe/Paris' },
  async () => {
    logger.info('Relance du matching', { ...(await relancerMatching(services())) });
  },
);

/** Scores de nuit (MATCHING [10]) : réactivité recopiée sur les entreprises, chaque nuit à 3 h. */
export const scoresNuit = onSchedule(
  { schedule: '0 3 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    logger.info('Scores de nuit', { ...(await calculerScoresNuit(services())) });
  },
);
