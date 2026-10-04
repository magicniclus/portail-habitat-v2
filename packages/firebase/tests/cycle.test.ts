import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { calculerCycles, envoyerDemandesManquees, planifierCycle } from '../src/serveur/cycle';

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
    metierPrincipal: 'peintre',
    adresseSiege: { ville: 'Bordeaux' },
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
    await db
      .collection(collections.cycleEtat)
      .doc('a1')
      .update({
        groupeTemoin: false,
        signaux: { vues7j: 31, position: 14, total: 22, vuesMisesEnAvant: 312 },
      });
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

  it('sans les chiffres de la zone, l’email ne part pas (« plus_valable »)', async () => {
    await artisan('v1');
    await calculerCycles(s(T0));
    await db.collection(collections.cycleEtat).doc('v1').update({ groupeTemoin: false });
    await planifierCycle(s(T0 + 3 * J));
    expect(envois).toEqual([]);
    expect(
      (await traces('email_annule')).map((t) => [t.modele, t.raison, t.details.manque]),
    ).toEqual([['vis-position', 'plus_valable', 'vues7j']]);
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
  it('un concurrent passe en Visibilité : signal « vis-concurrents » avec le recul, une seule fois', async () => {
    await artisan('moi');
    await artisan('rival');
    await artisan('loin', { adresseSiege: { ville: 'Lyon' } });
    await db.doc(chemins.artisanPublic('moi')).set({ scoreClassement: 80 });
    await db.doc(chemins.artisanPublic('rival')).set({ scoreClassement: 40 });
    await calculerCycles(s(T0));
    const etat = () => db.collection(collections.cycleEtat).doc('moi').get();
    expect((await etat()).get('signaux')).toMatchObject({ position: 1, total: 2, misesEnAvant: 0 });
    await db.doc(chemins.artisan('rival')).update({ optionVisibilite: true });
    await calculerCycles(s(T0 + J));
    expect((await etat()).data()).toMatchObject({
      signaux: { position: 2, positionPrec: 1, misesEnAvant: 1 },
      signal: { modele: 'vis-concurrents', extra: { recul: 1 } },
    });
    expect((await etat()).get('derniersSignaux.vis-concurrents')).toBeDefined();
    await db
      .collection(collections.cycleEtat)
      .doc('moi')
      .update({ groupeTemoin: false, 'signaux.recherchesSecteur30j': 146 });
    await planifierCycle(s(T0 + 2 * J));
    expect(envois.map((e) => e.modele)).toEqual(['vis-concurrents']);
    expect((envois[0] as unknown as { donnees: Record<string, unknown> }).donnees).toMatchObject({
      recul: 1,
      position: 2,
      total: 2,
      misesEnAvant: 1,
      recherches30j: 146,
    });
    expect((await etat()).get('signal')).toBeUndefined();
    await calculerCycles(s(T0 + 3 * J));
    expect((await etat()).get('signal')).toBeUndefined();
  });
  it('plus de 40 € d’appels d’offres en 30 jours : signal « prem-credits » avec les montants', async () => {
    await artisan('cr', { optionVisibilite: true });
    const achat = (moyen: string, prixHtCentimes: number, credits: number) =>
      db.collection(collections.achatsLeads).add({
        artisanId: 'cr',
        moyen,
        prixHtCentimes,
        credits,
        statut: 'paye',
        createdAt: Timestamp.fromMillis(T0 - 5 * J),
      });
    await achat('carte', 3000, 0);
    await achat('credits', 0, 2);
    await achat('inclus_premium', 0, 4);
    await calculerCycles(s(T0));
    const ref = db.collection(collections.cycleEtat).doc('cr');
    expect((await ref.get()).data()).toMatchObject({
      etape: 'visibilite',
      signaux: { creditsAchetes30j: 5, montantAchete30j: 5000 },
      signal: { modele: 'prem-credits', extra: { credits30j: 5, montant30jCentimes: 5000 } },
    });
    await ref.update({ groupeTemoin: false });
    await planifierCycle(s(T0 + J));
    expect(envois.map((e) => e.modele)).toEqual(['prem-credits']);
    await calculerCycles(s(T0 + 2 * J));
    expect((await ref.get()).get('signal')).toBeUndefined();
  });

  it('lundi : « prem-demandes-manquees » si 2 exclusives de son métier sont parties dans sa zone', async () => {
    const bordeaux = { latitude: 44.84, longitude: -0.58 };
    const zone = { centre: bordeaux, geohash: 'ezzz', rayonKm: 20 };
    await artisan('vis', { optionVisibilite: true, metiers: ['plombier'], zoneIntervention: zone });
    await artisan('seul', { optionVisibilite: true, metiers: ['peintre'], zoneIntervention: zone });
    await db.doc(chemins.prestationItem('sdb')).set({ nom: 'Salle de bain' });
    for (const [id, min, max] of [
      ['d1', 800_000, 1_000_000],
      ['d2', 300_000, 400_000],
    ] as const) {
      await db.doc(chemins.demande(id)).set({
        prestationId: 'sdb',
        metierRequis: 'plombier',
        adresseChantier: { ville: 'Talence', geo: bordeaux },
        estimation: { minCentimes: min, maxCentimes: max },
      });
      await db.doc(chemins.attribution(id, 'premium-1')).set({
        artisanId: 'premium-1',
        demandeId: id,
        exclusive: true,
        proposeeLe: Timestamp.fromMillis(T0 - 2 * J),
      });
    }
    await calculerCycles(s(T0 - J));
    for (const id of ['vis', 'seul'])
      await db.collection(collections.cycleEtat).doc(id).update({ groupeTemoin: false });
    expect(await envoyerDemandesManquees(s(T0))).toEqual({ demandes: 2, planifies: 1 });
    expect(envois).toHaveLength(1);
    const e = envois[0] as unknown as {
      modele: string;
      destinataire: { artisanId: string };
      donnees: Record<string, unknown>;
    };
    expect(e.modele).toBe('prem-demandes-manquees');
    expect(e.destinataire.artisanId).toBe('vis');
    expect(e.donnees.demandes).toEqual([
      { travaux: 'Salle de bain', ville: 'Talence', budgetCentimes: 900_000 },
      { travaux: 'Salle de bain', ville: 'Talence', budgetCentimes: 350_000 },
    ]);
    expect(e.donnees.semaine).toBe('Semaine du 29 septembre 2026 au 5 octobre 2026');
  });
});
