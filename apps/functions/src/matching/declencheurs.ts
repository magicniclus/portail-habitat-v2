import { appAdmin } from '@ph/firebase/admin';
import {
  attribuerDemande,
  calculerScoresNuit,
  lireConfigMatching,
  relancerMatching,
} from '@ph/firebase/matching';
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
const services = async () => {
  const db = getFirestore(appAdmin());
  // Réglages publiés depuis l'admin (ADMIN §2.10), relus à chaque exécution.
  return { db, horloge: Date.now, notifier, config: await lireConfigMatching(db) };
};

export const attribuerNouvelleDemande = onDocumentCreated(
  { document: 'demandes/{demandeId}', region: REGION, retry: true },
  async (evenement) => {
    const demandeId = evenement.params.demandeId;
    const resultat = await attribuerDemande(await services(), demandeId);
    // Identifiant et résultat seulement : aucune donnée personnelle dans les journaux.
    logger.info('Attribution', { demandeId, resultat });
  },
);

/** `matchingRelance` (MATCHING [7]) : expirations, conversions en appel d'offres, sans preneur. */
export const matchingRelance = onSchedule(
  { schedule: 'every 15 minutes', region: REGION, timeZone: 'Europe/Paris' },
  async () => {
    const bilan = await relancerMatching(await services());
    logger.info('Relance du matching', { ...bilan });
    // Supervision IMP-04 : une demande sans proposition après 15 min déclenche une alerte.
    if (bilan.enRetard > 0)
      logger.error('Demandes sans proposition depuis plus de 15 minutes', {
        enRetard: bilan.enRetard,
      });
  },
);

/** Scores de nuit (MATCHING [10]) : réactivité recopiée sur les entreprises, chaque nuit à 3 h. */
export const scoresNuit = onSchedule(
  { schedule: '0 3 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    logger.info('Scores de nuit', { ...(await calculerScoresNuit(await services())) });
  },
);
