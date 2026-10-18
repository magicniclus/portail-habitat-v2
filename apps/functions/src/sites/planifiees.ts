import { appAdmin } from '@ph/firebase/admin';
import {
  controlerDomaineActif,
  domainesAControler,
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
const services = () => ({
  db: getFirestore(appAdmin()),
  horloge: Date.now,
  domaineBase: process.env.DOMAINE_SITES ?? 'portailtravaux.fr',
  hebergeur: hebergeurDepuisEnv(),
  dns: resolveurDoh(),
  notifier,
});

export const verifierDomaines = onSchedule(
  { schedule: 'every 2 minutes', region: REGION, timeoutSeconds: 120 },
  async () => {
    const s = services();
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

/**
 * `controlerDomaines` (chaque jour, 6 h) : domaines actifs relus ; DNS incorrect 3 jours → `casse`,
 * le sous-domaine reprend le relais (DOM-06) ; corrigé → réactivé.
 */
export const controlerDomaines = onSchedule(
  { schedule: '0 6 * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    const s = services();
    const bilan: Record<string, number> = {};
    for (const id of await domainesAControler(s)) {
      const r = await controlerDomaineActif(s, id).catch((e: unknown) => {
        logger.error('Contrôle de domaine', { siteId: id, erreur: String(e) });
        return 'erreur';
      });
      bilan[r ?? 'ignore'] = (bilan[r ?? 'ignore'] ?? 0) + 1;
    }
    logger.info('Domaines contrôlés', bilan);
  },
);
