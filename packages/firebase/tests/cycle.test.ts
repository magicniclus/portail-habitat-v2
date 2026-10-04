import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { calculerCycles, planifierCycle } from '../src/serveur/cycle';

let db: Firestore;
const J = 86_400_000;
// Mardi 6 octobre 2026, 7 h à Paris.
const T0 = Date.UTC(2026, 9, 6, 5);
const envois: { modele: string; envoyerLe?: Date; destinataire: { uid?: string } }[] = [];
const s = (t: number) => ({
  db,
  horloge: () => t,
  notifier: async (e: unknown) => void envois.push(e as (typeof envois)[number]),
});

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  envois.length = 0;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

const artisan = (id: string, p: Record<string, unknown> = {}) =>
  db.doc(chemins.artisan(id)).set({
    nomCommercial: `Entreprise ${id}`,
    statut: 'actif',
    enLigne: true,
    plan: 'gratuit',
    optionVisibilite: false,
    metiers: ['peintre'],
    completude: 80,
    proprietaireUid: `u-${id}`,
    ...p,
  });
const traces = async (type: string) =>
  (await db.collection(collections.cycleTraces).where('type', '==', type).get()).docs.map((d) =>
    d.data(),
  );

describe('moteur de conversion (CONVERSION §9)', () => {
  it('gratuit en ligne : S4, vis-position à J+3 au créneau, puis rien avant J+14', async () => {
    await artisan('a1');
    expect(await calculerCycles(s(T0))).toEqual({ entreprises: 1, changements: 1 });
    await db.collection(collections.cycleEtat).doc('a1').update({ groupeTemoin: false });
    const etat = (await db.collection(collections.cycleEtat).doc('a1').get()).data()!;
    expect(etat).toMatchObject({
      etape: 'gratuit_actif',
      offreCible: 'visibilite',
      sequence: { id: 'S4', etape: 0 },
    });
    expect(await planifierCycle(s(T0 + J))).toMatchObject({ planifies: 0 });
    expect(envois).toEqual([]);
    expect(await planifierCycle(s(T0 + 3 * J))).toMatchObject({ planifies: 1 });
    expect(envois.map((e) => e.modele)).toEqual(['vis-position']);
    expect(envois[0]!.envoyerLe!.toISOString()).toBe('2026-10-13T05:15:00.000Z');
    await planifierCycle(s(T0 + 5 * J));
    expect(envois).toHaveLength(1);
    expect((await traces('email_planifie')).map((t) => t.modele)).toEqual(['vis-position']);
  });

  it('groupe témoin, pression et interrupteur : rien ne part, la décision est tracée', async () => {
    await artisan('t1');
    await artisan('p1');
    await calculerCycles(s(T0));
    await db.collection(collections.cycleEtat).doc('t1').update({ groupeTemoin: true });
    await db.collection(collections.cycleEtat).doc('p1').update({ groupeTemoin: false });
    for (const j of [1, 2])
      await db.collection(collections.emails).add({
        uid: 'u-p1',
        categorie: 'offres_pro',
        createdAt: Timestamp.fromMillis(T0 + j * J),
        envoyerLe: Timestamp.fromMillis(T0 + j * J),
      });
    await planifierCycle(s(T0 + 3 * J));
    expect(envois).toEqual([]);
    expect((await traces('email_bloque')).map((t) => [t.artisanId, t.raison]).sort()).toEqual([
      ['p1', 'pression'],
      ['t1', 'temoin'],
    ]);
    await db.doc(chemins.configCycle()).set({ actif: false });
    await artisan('i1');
    await calculerCycles(s(T0 + 10 * J));
    await db.collection(collections.cycleEtat).doc('i1').update({ groupeTemoin: false });
    await planifierCycle(s(T0 + 13 * J));
    expect(
      (await traces('email_bloque')).some(
        (t) => t.artisanId === 'i1' && t.raison === 'interrupteur',
      ),
    ).toBe(true);
    expect(envois).toEqual([]);
  });

  it('changement d’étape : Premium → S7 ; offre cible Premium (score ≥ 50) → S5', async () => {
    await artisan('pr', { plan: 'premium' });
    await artisan('fort', {
      metiers: ['a', 'b', 'c'],
      tempsReponseMoyenMin: 30,
      demandesRecuesMois: 8,
      completude: 100,
    });
    await calculerCycles(s(T0));
    expect((await db.collection(collections.cycleEtat).doc('pr').get()).get('sequence.id')).toBe(
      'S7',
    );
    expect((await db.collection(collections.cycleEtat).doc('fort').get()).data()).toMatchObject({
      offreCible: 'premium',
      sequence: { id: 'S5' },
    });
    await db.doc(chemins.artisan('pr')).update({ plan: 'gratuit' });
    await db
      .collection(collections.abonnements)
      .doc('sub')
      .set({ artisanId: 'pr', statut: 'canceled' });
    expect(await calculerCycles(s(T0 + J))).toMatchObject({ changements: 1 });
    expect((await db.collection(collections.cycleEtat).doc('pr').get()).data()).toMatchObject({
      etape: 'ancien_client',
      sequence: { id: 'S9' },
    });
  });
});
