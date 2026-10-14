import { appAdmin } from '@ph/firebase/admin';
import {
  domainesAVerifier,
  hebergeurDepuisEnv,
  resolveurDoh,
  verifierDomaineSite,
} from '@ph/firebase/sites';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/**
 * `verifierDomaines` (toutes les 2 min, DOMAINES §4) : domaines dont la vérification est due ;
 * chaque site est vérifié seul (une erreur n'arrête pas les autres). Clés Vercel en secrets.
 */
export const verifierDomaines = onSchedule(
  { schedule: 'every 2 minutes', region: REGION, timeoutSeconds: 120 },
  async () => {
    const s = {
      db: getFirestore(appAdmin()),
      horloge: Date.now,
      domaineBase: process.env.DOMAINE_SITES ?? 'portailhabitat.fr',
      hebergeur: hebergeurDepuisEnv(),
      dns: resolveurDoh(),
      notifier,
    };
    const ids = await domainesAVerifier(s);
    const bilan: Record<string, number> = {};
    for (const id of ids) {
      const statut = await verifierDomaineSite(s, id).catch((e: unknown) => {
        logger.error('Vérification de domaine', { siteId: id, erreur: String(e) });
        return 'erreur';
      });
      bilan[statut ?? 'ignore'] = (bilan[statut ?? 'ignore'] ?? 0) + 1;
    }
    if (ids.length) logger.info('Domaines vérifiés', bilan);
  },
);
