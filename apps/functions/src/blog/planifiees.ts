import { appAdmin } from '@ph/firebase/admin';
import {
  preparerArticlesPilote,
  publierArticlesPlanifies,
  viderCorbeilleBlog,
} from '@ph/firebase/blog';
import { clientAnthropic } from '@ph/firebase/ia';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/** `publierArticlesBlog` (toutes les 5 min, DATABASE §15 quater) : planifié → publié. */
export const publierArticlesBlog = onSchedule(
  { schedule: 'every 5 minutes', region: REGION, timeoutSeconds: 120 },
  async () => {
    const n = await publierArticlesPlanifies(getFirestore(appAdmin()), Date.now());
    if (n) logger.info('Articles publiés', { n });
  },
);

/** `viderCorbeilleBlog` (chaque nuit) : articles supprimés depuis plus de 30 jours (BLOG §5). */
export const viderCorbeilleBlogNuit = onSchedule(
  { schedule: '20 3 * * *', timeZone: 'Europe/Paris', region: REGION, timeoutSeconds: 300 },
  async () => {
    const n = await viderCorbeilleBlog(getFirestore(appAdmin()), Date.now());
    if (n) logger.info('Corbeille du blog vidée', { n });
  },
);

/**
 * `piloteBlog` (toutes les heures) : articles du pilote dont la publication est dans 48 h,
 * rédigés en brouillon puis email `blog-a-valider` (D70 : rien n'est publié sans le clic).
 */
export const piloteBlog = onSchedule(
  { schedule: '25 * * * *', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 540 },
  async () => {
    const cle = process.env.ANTHROPIC_API_KEY;
    if (!cle) return logger.info('Pilote du blog : clé API absente');
    const r = await preparerArticlesPilote({
      db: getFirestore(appAdmin()),
      horloge: Date.now,
      client: clientAnthropic(cle),
      notifier,
    });
    if (r.prepares || r.echecs) logger.info('Pilote du blog', r);
  },
);
