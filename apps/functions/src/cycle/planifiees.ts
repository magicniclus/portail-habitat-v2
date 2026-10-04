import { appAdmin } from '@ph/firebase/admin';
import { calculerCycles, envoyerDemandesManquees, planifierCycle } from '@ph/firebase/cycle';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/** Moteur de conversion (CONVERSION §9) : tâches planifiées, fuseau de Paris. */
const services = () => ({ db: getFirestore(appAdmin()), horloge: Date.now, notifier });

/** `cycleCalculer` (5 h) : étape, score, offre cible et séquence de chaque entreprise active. */
export const cycleCalculer = onSchedule(
  { schedule: '0 5 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    logger.info('Cycle : calcul', { ...(await calculerCycles(services())) });
  },
);

/** `cyclePlanifier` (7 h 00 et 18 h 15) : étapes dues des séquences, contrôle de pression, envoi. */
export const cyclePlanifier = onSchedule(
  { schedule: '0 7 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    logger.info('Cycle : planification', { ...(await planifierCycle(services())) });
  },
);
export const cyclePlanifierSoir = onSchedule(
  { schedule: '15 18 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    logger.info('Cycle : planification du soir', { ...(await planifierCycle(services())) });
  },
);

/** `cycleHebdo` (lundi 7 h) : demandes exclusives parties chez un Premium du secteur. */
export const cycleHebdo = onSchedule(
  { schedule: '0 7 * * 1', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    logger.info('Cycle : hebdomadaire', { ...(await envoyerDemandesManquees(services())) });
  },
);
