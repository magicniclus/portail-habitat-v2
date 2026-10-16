import { appAdmin } from '@ph/firebase/admin';
import { publierArticlesPlanifies, viderCorbeilleBlog } from '@ph/firebase/blog';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';

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
