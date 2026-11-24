import { appAdmin } from '@ph/firebase/admin';
import { depuisFirestore } from '@ph/firebase/conversion';
import { communesApiGouv, recompterPages, suivreArtisan } from '@ph/firebase/pages-secteur';
import { artisanPublic } from '@ph/core/schemas';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../callable';

const lire = (d: FirebaseFirestore.DocumentData | undefined) => {
  if (!d) return undefined;
  const r = artisanPublic.safeParse(depuisFirestore(d));
  return r.success ? r.data : undefined;
};

/**
 * Pages de secteur (SEO local) : une fiche publique change (mise en ligne, hors ligne, métiers,
 * position, rayon) → pages manquantes créées, pages voisines recomptées et (dés)indexées.
 * Rejoué en cas d'erreur (API des communes indisponible) : aucune page approximative.
 */
export const suivrePagesSecteur = onDocumentWritten(
  { document: 'artisansPublic/{artisanId}', region: REGION, retry: true },
  async (e) => {
    const r = await suivreArtisan(
      { db: getFirestore(appAdmin()), horloge: Date.now, communes: communesApiGouv },
      lire(e.data?.before.data()),
      lire(e.data?.after.data()),
    );
    if (r.creees.length || r.maj.length)
      logger.info('Pages de secteur', { artisanId: e.params.artisanId, ...r });
  },
);

/**
 * `pagesSecteurNuit` (chaque nuit, 4 h 10) : recompte toutes les pages par lots de 300, jusqu'à
 * 8 minutes ; filet de sécurité si un déclencheur a été manqué.
 */
export const pagesSecteurNuit = onSchedule(
  { schedule: '10 4 * * *', timeZone: 'Europe/Paris', region: REGION, timeoutSeconds: 540 },
  async () => {
    const s = { db: getFirestore(appAdmin()), horloge: Date.now };
    const fin = Date.now() + 8 * 60_000;
    let apres: string | undefined;
    let total = { lues: 0, maj: 0 };
    while (Date.now() < fin) {
      const r = await recompterPages(s, { ...(apres ? { apres } : {}), limite: 300 });
      total = { lues: total.lues + r.lues, maj: total.maj + r.maj };
      if (!r.dernier || r.lues < 300) break;
      apres = r.dernier;
    }
    logger.info('Recomptage des pages de secteur', total);
  },
);
