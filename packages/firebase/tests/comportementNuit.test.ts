import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import { agregerComportementJour, decalerJour } from '../src/serveur/comportement';

/** Nuit (COMPORTEMENT §3, §4 ; CMP-03, CMP-04) : agrégats, cumuls, alertes et tests A/B. */
let db: Firestore;
const T = Date.UTC(2026, 9, 6, 1);
const JOUR = '2026-10-05';
const session = (i: number, surcharge: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  sessionId: `s${i}`,
  page: 'acquisition-artisans',
  app: 'pro',
  appareil: i % 2 ? 'mobile' : 'ordinateur',
  largeur: i % 2 ? 390 : 1440,
  hauteur: 4000,
  source: 'direct',
  nouvelle: true,
  duree: 20_000,
  profondeur: 60,
  cellulesClics: { '10:10': 1 },
  cellulesAttention: {},
  sections: { hero: 4000 },
  elements: {},
  morts: [],
  rages: [],
  champs: {},
  sortie: { section: 'hero', type: 'fermeture', intention: false },
  jour: JOUR,
  createdAt: Timestamp.fromMillis(T),
  expireLe: Timestamp.fromMillis(T + 35 * 86_400_000),
  ...surcharge,
});
const semer = async (n: number, f: (i: number) => Record<string, unknown> = () => ({})) => {
  const lot = db.batch();
  for (let i = 0; i < n; i++)
    lot.set(db.collection(collections.comportementSessions).doc(`v${i}`), session(i, f(i)));
  await lot.commit();
};
const agregat = async (id: string) =>
  (await db.collection(collections.comportementAgregats).doc(id).get()).data();

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

describe('agregerComportementJour', () => {
  it('écrit la journée par appareil et les cumuls prêts à afficher (CMP-03)', async () => {
    await semer(4, (i) => (i === 0 ? { conversion: 'inscription' } : {}));
    const bilan = await agregerComportementJour(db, JOUR, () => T);
    expect(bilan.sessions).toBe(4);
    expect(await agregat(`acquisition-artisans_${JOUR}_ordinateur`)).toMatchObject({
      periode: 'jour',
      jour: JOUR,
      sessions: 2,
      conversions: 1,
      grilleClics: JSON.stringify({ '10:10': 2 }),
      sorties: [{ section: 'hero', part: 1 }],
    });
    expect(await agregat(`acquisition-artisans_7j_tous`)).toMatchObject({
      periode: '7j',
      jusquAu: JOUR,
      sessions: 4,
      grilleClics: '{}',
    });
    expect(await agregat(`acquisition-artisans_${JOUR}_tablette`)).toBeUndefined();
    expect((await agregat('accueil_90j_mobile'))!.sessions).toBe(0);
  });

  it('cumule les journées précédentes dans les fenêtres 7, 30 et 90 jours', async () => {
    await semer(2);
    await agregerComportementJour(db, JOUR, () => T);
    const lendemain = decalerJour(JOUR, 1);
    await agregerComportementJour(db, lendemain, () => T + 86_400_000);
    const loin = decalerJour(JOUR, 10);
    await agregerComportementJour(db, loin, () => T + 10 * 86_400_000);
    expect((await agregat('acquisition-artisans_7j_tous'))!.sessions).toBe(0);
    expect((await agregat('acquisition-artisans_30j_tous'))!.sessions).toBe(2);
  });

  it('crée une alerte de rage et une tâche quand la friction est forte (CMP-04)', async () => {
    await semer(250, (i) => (i < 10 ? { rages: ['hero>img:1'], morts: ['hero>img:1'] } : {}));
    const bilan = await agregerComportementJour(db, JOUR, () => T);
    expect(bilan.alertes).toBe(2);
    const rage = await db
      .collection(collections.comportementAlertes)
      .doc('acquisition-artisans_rage_hero-img-1')
      .get();
    expect(rage.data()).toMatchObject({ type: 'rage', statut: 'ouverte', gravite: 5 });
    const taches = await db
      .collection(collections.filesModeration)
      .where('type', '==', 'friction_page')
      .get();
    expect(taches.size).toBe(1);
    // La nuit suivante, la même friction ne crée ni alerte ni tâche de plus.
    expect((await agregerComportementJour(db, JOUR, () => T + 1000)).alertes).toBe(0);
    expect((await db.collection(collections.filesModeration).get()).size).toBe(1);
  });

  it('laisse ignorée une alerte ignorée', async () => {
    await semer(250, (i) => (i < 10 ? { rages: ['hero>img:1'] } : {}));
    await db
      .collection(collections.comportementAlertes)
      .doc('acquisition-artisans_rage_hero-img-1')
      .set({ statut: 'ignoree' });
    expect((await agregerComportementJour(db, JOUR, () => T)).alertes).toBe(0);
  });

  it('évalue un test A/B en cours sans basculer la page', async () => {
    await semer(400, (i) => ({
      variante: i % 2 ? 'B' : 'A',
      ...(i % 2
        ? i % 4 === 1
          ? { conversion: 'inscription' }
          : {}
        : i % 20 === 0
          ? { conversion: 'inscription' }
          : {}),
    }));
    const ref = db.collection(collections.abTests).doc('t1');
    await ref.set({
      page: 'acquisition-artisans',
      statut: 'en_cours',
      debut: Timestamp.fromMillis(Date.UTC(2026, 9, 1)),
      variantes: [
        { id: 'A', poids: 0.5 },
        { id: 'B', poids: 0.5 },
      ],
    });
    expect((await agregerComportementJour(db, JOUR, () => T)).tests).toBe(1);
    const t = (await ref.get()).data()!;
    expect(t.statut).toBe('en_cours');
    expect(t.resultat).toMatchObject({
      proposee: 'B',
      variantes: [
        { id: 'A', sessions: 200, conversions: 20 },
        { id: 'B', sessions: 200, conversions: 100 },
      ],
    });
  });
});
