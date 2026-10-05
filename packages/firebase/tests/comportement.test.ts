import { gunzipSync } from 'node:zlib';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ResumeVisite } from '@ph/core/schemas';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import { enregistrerVisite, lireConfigComportement } from '../src/serveur/comportement';
import { dependancesEnveloppe } from '../src/serveur/enveloppe';

/** Route /api/t (COMPORTEMENT §3) : un document par page vue, replays plafonnés. */
let db: Firestore;
const T = Date.UTC(2026, 9, 6, 8);
const depots = new Map<string, Buffer>();
const services = () => ({
  db,
  horloge: () => T,
  deposerReplay: async (chemin: string, contenu: Buffer) => void depots.set(chemin, contenu),
  limiterDebit: dependancesEnveloppe(
    () => db,
    () => T,
  ).limiterDebit!,
});
const actif = { actif: true, echantillon: 1 };
const resume = (surcharge: Partial<ResumeVisite> = {}): ResumeVisite => ({
  v: 1,
  sessionId: 'abcdefgh12345678',
  vueId: 'vue0000000000001',
  page: 'acquisition-artisans',
  app: 'pro',
  appareil: 'ordinateur',
  largeur: 1440,
  hauteur: 4200,
  source: 'direct',
  nouvelle: true,
  duree: 30_000,
  profondeur: 60,
  cellulesClics: { '32:2': 1 },
  cellulesAttention: {},
  sections: { hero: 8000 },
  elements: {},
  morts: [],
  rages: [],
  champs: {},
  sortie: { section: 'hero', type: 'fermeture', intention: false },
  ...surcharge,
});
const lire = async (id = 'vue0000000000001') =>
  (await db.collection(collections.comportementSessions).doc(id).get()).data();

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  depots.clear();
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

describe('enregistrerVisite', () => {
  it('écrit un résumé par page vue, avec le jour et une expiration à 35 jours', async () => {
    expect(await enregistrerVisite(services(), resume(), actif)).toBe('enregistree');
    const d = await lire();
    expect(d).toMatchObject({ page: 'acquisition-artisans', jour: '2026-10-06', profondeur: 60 });
    expect(d!.expireLe.toMillis() - T).toBe(35 * 86_400_000);
    expect(d).not.toHaveProperty('vueId');
    expect(d).not.toHaveProperty('replay');
  });

  it('garde le dernier envoi d’une même page vue', async () => {
    await enregistrerVisite(services(), resume(), actif);
    await enregistrerVisite(services(), resume({ duree: 90_000, profondeur: 95 }), actif);
    expect(await lire()).toMatchObject({ duree: 90_000, profondeur: 95 });
    expect((await db.collection(collections.comportementSessions).get()).size).toBe(1);
  });

  it('ignore une page non suivie ou un espace qui ne correspond pas', async () => {
    expect(await enregistrerVisite(services(), resume({ page: 'mon-espace' }), actif)).toBe(
      'ignoree',
    );
    expect(await enregistrerVisite(services(), resume({ app: 'particulier' }), actif)).toBe(
      'ignoree',
    );
    expect(await lire()).toBeUndefined();
  });

  it('respecte la mesure coupée et l’échantillonnage', async () => {
    expect(await enregistrerVisite(services(), resume(), { actif: false, echantillon: 1 })).toBe(
      'ignoree',
    );
    expect(await enregistrerVisite(services(), resume(), { actif: true, echantillon: 0 })).toBe(
      'ignoree',
    );
  });

  it('dépose le replay compressé une seule fois, même après un envoi de secours', async () => {
    const r = resume({ rages: ['hero>img:1'], replay: [[100, 1, 640, 300]] });
    await enregistrerVisite(services(), r, actif);
    await enregistrerVisite(
      services(),
      {
        ...r,
        replay: [
          [100, 1, 640, 300],
          [900, 2, 0, 400],
        ],
      },
      actif,
    );
    const chemin = 'replays/acquisition-artisans/2026-10-06/vue0000000000001.json.gz';
    expect((await lire())!.replayPath).toBe(chemin);
    expect(JSON.parse(gunzipSync(depots.get(chemin)!).toString())).toMatchObject({
      appareil: 'ordinateur',
      evenements: [
        [100, 1, 640, 300],
        [900, 2, 0, 400],
      ],
    });
    const quota = (await db.collection(collections.rateLimits).get()).docs[0]!.data();
    expect(quota.compteur).toBe(1);
  });

  it('cesse de garder des replays au-delà de 300 par jour', async () => {
    const limiter = async () => false;
    await enregistrerVisite(
      { ...services(), limiterDebit: limiter },
      resume({ replay: [[0, 0, 1, 1]] }),
      actif,
    );
    expect((await lire())!.replayPath).toBeUndefined();
    expect(depots.size).toBe(0);
  });

  it('lit la configuration, active par défaut', async () => {
    expect(await lireConfigComportement(db)).toEqual({ actif: true, echantillon: 1 });
    await db.doc('config/comportement').set({ actif: false, echantillon: 0.5 });
    expect(await lireConfigComportement(db)).toEqual({ actif: false, echantillon: 0.5 });
  });
});
