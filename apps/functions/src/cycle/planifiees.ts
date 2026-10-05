import { appAdmin } from '@ph/firebase/admin';
import {
  agregerCycleJour,
  calculerCycles,
  envoyerDemandesManquees,
  expirerCodes,
  offrirDemandesInvendues,
  planifierCycle,
} from '@ph/firebase/cycle';
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

/** `cycleCodesExpires` (chaque heure) : codes personnels arrivés à échéance désactivés. */
export const cycleCodesExpires = onSchedule(
  { schedule: '0 * * * *', region: REGION, timeZone: 'Europe/Paris' },
  async () => {
    const n = await expirerCodes(getFirestore(appAdmin()), Date.now());
    if (n) logger.info('Cycle : codes expirés', { n });
  },
);

/** `cycleDemandesInvendues` (chaque heure) : appels d'offres sans preneur offerts contre Visibilité. */
export const cycleDemandesInvendues = onSchedule(
  { schedule: '30 * * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 300 },
  async () => {
    logger.info('Cycle : demandes offertes', { ...(await offrirDemandesInvendues(services())) });
  },
);

/** `cycleAgreger` (chaque nuit, 1 h 30) : statistiques de la veille dans `cycleStats/{jour}`. */
export const cycleAgreger = onSchedule(
  { schedule: '30 1 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 300 },
  async () => {
    const veille = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
      Date.now() - 86_400_000,
    );
    await agregerCycleJour(getFirestore(appAdmin()), veille);
    logger.info('Cycle : agrégat', { jour: veille });
  },
);
