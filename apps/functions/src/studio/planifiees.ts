import { appAdmin, bucketFichiers } from '@ph/firebase/admin';
import { configReseaux, publierDuesStudio, releverStatsStudio } from '@ph/firebase/studio';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';

/**
 * `studioPublier` (STUDIO.md §11) : toutes les 10 min, envoie les vidéos programmées arrivées à
 * leur heure sur YouTube, Instagram et TikTok. Jetons lus chiffrés, jamais journalisés.
 */
export const studioPublier = onSchedule(
  {
    schedule: 'every 10 minutes',
    region: REGION,
    timeZone: 'Europe/Paris',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async () => {
    const bucket = bucketFichiers();
    const bilan = await publierDuesStudio({
      db: getFirestore(appAdmin()),
      horloge: Date.now,
      reseaux: configReseaux(process.env),
      outils: { fetch, attendre: (ms) => new Promise((ok) => setTimeout(ok, ms)) },
      video: {
        lire: async (c) => new Uint8Array((await bucket.file(c).download())[0]),
        // Instagram vient chercher la vidéo : adresse valable 6 h.
        urlSignee: async (c) =>
          (
            await bucket
              .file(c)
              .getSignedUrl({ action: 'read', expires: Date.now() + 6 * 3_600_000 })
          )[0],
      },
    });
    if (bilan.publiees || bilan.echecs) logger.info('Studio : publications', bilan);
  },
);

/** `studioStats` (STUDIO.md §12) : toutes les 6 h, résultats des vidéos publiées depuis 30 jours. */
export const studioStats = onSchedule(
  { schedule: 'every 6 hours', region: REGION, timeZone: 'Europe/Paris', timeoutSeconds: 300 },
  async () => {
    const bilan = await releverStatsStudio({
      db: getFirestore(appAdmin()),
      horloge: Date.now,
      reseaux: configReseaux(process.env),
      fetch,
    });
    logger.info('Studio : statistiques', bilan);
  },
);
