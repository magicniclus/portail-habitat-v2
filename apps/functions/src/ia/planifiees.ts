import { appAdmin } from '@ph/firebase/admin';
import {
  calculerContextesIa,
  clientAnthropic,
  lireConfigIa,
  mesurerEffetsIa,
  syntheseHebdoIa,
} from '@ph/firebase/ia';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/**
 * Clé de l'API Claude : variable `ANTHROPIC_API_KEY` liée au secret du même nom une fois créé
 * (Secret Manager). Absente, l'assistant reste coupé sans erreur et le déploiement passe.
 */

/**
 * `iaContexte` (chaque nuit, 3 h 30, après l'agrégation du comportement) : contexte compact, puis
 * effet des recommandations faites il y a 30 jours (seulement si la clé API est posée).
 */
export const iaContexteNuit = onSchedule(
  { schedule: '30 3 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 300 },
  async () => {
    const db = getFirestore(appAdmin());
    await calculerContextesIa(db, Date.now());
    logger.info('IA : contexte de nuit écrit');
    const cle = process.env.ANTHROPIC_API_KEY;
    if (!cle) return;
    const r = await mesurerEffetsIa({ db, horloge: Date.now, client: clientAnthropic(cle) });
    logger.info('IA : effets mesurés', r);
  },
);

/** `iaSyntheseHebdo` (lundi 7 h) : audit complet envoyé aux superadmins (IA-07). */
export const iaSyntheseHebdo = onSchedule(
  {
    schedule: '0 7 * * 1',
    region: REGION,
    timeZone: 'Europe/Paris',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore(appAdmin());
    const cle = process.env.ANTHROPIC_API_KEY;
    if (!cle) return logger.info('IA : synthèse ignorée, clé API absente');
    if (!(await lireConfigIa(db)).analyseHebdo)
      return logger.info('IA : synthèse hebdomadaire désactivée');
    const r = await syntheseHebdoIa({
      db,
      horloge: Date.now,
      client: clientAnthropic(cle),
      notifier,
    });
    logger.info('IA : synthèse hebdomadaire', r);
  },
);
