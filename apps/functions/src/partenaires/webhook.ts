import { appAdmin } from '@ph/firebase/admin';
import { geocodeurApiGeo } from '@ph/firebase/demandes';
import { importerDemandePartenaire } from '@ph/firebase/partenaires';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { REGION } from '../callable';
import { notifier } from '../notifications/configuration';

/** Taille maximale d'une demande (IMPORT_LEADS §2). */
const TAILLE_MAX = 32 * 1024;

/** Première adresse de la chaîne de proxys (Google Front End) : celle du partenaire. */
const ipAppelant = (entete: string | string[] | undefined, defaut: string) =>
  (Array.isArray(entete) ? entete[0] : entete)?.split(',')[0]?.trim() || defaut;

/**
 * Webhook `importerDemandePartenaire` (IMPORT_LEADS) : une demande par appel, en temps réel.
 * Journal sans donnée personnelle : source, identifiant externe, statut et durée seulement.
 */
export const importerDemandePartenaireHttp = onRequest(
  { region: REGION, cors: false, timeoutSeconds: 30, concurrency: 20 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ erreur: 'methode' });
      return;
    }
    if (
      Number(req.headers['content-length'] ?? 0) > TAILLE_MAX ||
      req.rawBody.length > TAILLE_MAX
    ) {
      res.status(413).json({ erreur: 'trop_volumineux' });
      return;
    }
    const debut = Date.now();
    const r = await importerDemandePartenaire(
      {
        db: getFirestore(appAdmin()),
        horloge: Date.now,
        geocoder: geocodeurApiGeo(),
        notifier,
        urlSite: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
        smsConfirmation: true,
      },
      {
        sourceId: req.get('x-source-id'),
        cleApi: req.get('x-api-key'),
        ip: ipAppelant(req.headers['x-forwarded-for'], req.ip ?? ''),
        corps: req.body as unknown,
      },
    );
    logger.info('Import partenaire', {
      sourceId: req.get('x-source-id'),
      idExterne: r.corps.idExterne,
      http: r.http,
      statut: r.corps.statut ?? r.corps.erreur,
      motifRejet: r.corps.motifRejet,
      dureeMs: Date.now() - debut,
    });
    res.status(r.http).json(r.corps);
  },
);
