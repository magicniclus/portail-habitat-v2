import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  agirSurCycleAdmin,
  basculerSequenceAdmin,
  dupliquerSequenceAdmin,
  enregistrerReglagesCycleAdmin,
  enregistrerSequenceAdmin,
  lireApercuConversion,
  lireFicheCycle,
  lireJournalCycle,
  lireReglagesCycle,
  listerSequencesAdmin,
  supprimerSequenceAdmin,
} from '../src/serveur/admin';
import { agregerCycleJour, planifierCycle, tracer } from '../src/serveur/cycle';

/** Back-office › Conversion (ADMIN §2.8b, CONV-05). */
let db: Firestore;
const T = Date.UTC(2026, 9, 6, 5);
const J = 86_400_000;
let tic = 0;
const s = { horloge: () => T + tic++ } as { db: Firestore; horloge: () => number };
const acteurUid = 'admin-1';
const motif = 'Réglage de la séquence';

beforeAll(() => {
  db = getFirestore(appAdmin());
  s.db = db;
});
beforeEach(async () => {
  tic = 0;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db
    .doc(chemins.artisan('a1'))
    .set({ nomCommercial: 'Bertrand Rénovation', plan: 'gratuit' });
  await db
    .collection(collections.cycleEtat)
    .doc('a1')
    .set({
      etape: 'gratuit_actif',
      score: 62,
      offreCible: 'premium',
      groupeTemoin: false,
      exclu: false,
      signaux: { vues7j: 74, position: 3 },
      sequence: { id: 'S4', etape: 1, prochainEnvoi: Timestamp.fromMillis(T) },
    });
});
const audits = async () =>
  (await db.collection(collections.auditLog).orderBy('createdAt').get()).docs.map((d) =>
    d.get('action'),
  );

describe('séquences (CONV-05)', () => {
  it('liste : séquences par défaut, entreprises en cours', async () => {
    const l = await listerSequencesAdmin(db, T);
    expect(l.map((x) => x.id)).toEqual(['S1', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']);
    expect(l.find((x) => x.id === 'S4')).toMatchObject({
      parDefaut: true,
      enCours: 1,
      actif: true,
    });
  });

  it('créer, modifier (version), dupliquer, mettre en pause : versions et audit', async () => {
    const etapes = [{ modele: 'vis-position', declencheur: 'delai' as const, valeur: 3 }];
    const cree = await enregistrerSequenceAdmin(s, {
      acteurUid,
      motif,
      sequence: {
        nom: 'Test',
        etapeEntree: 'gratuit_actif',
        objectif: 'payer',
        actif: false,
        etapes,
      },
    });
    expect(cree).toEqual({ id: 'S2', version: 1 });
    expect(
      await enregistrerSequenceAdmin(s, {
        acteurUid,
        motif,
        sequence: {
          id: 'S2',
          nom: 'Test 2',
          etapeEntree: 'gratuit_actif',
          objectif: 'payer',
          actif: true,
          etapes,
        },
      }),
    ).toEqual({ id: 'S2', version: 2 });
    expect((await db.collection(chemins.versionsSequence('S2')).get()).size).toBe(2);
    const copie = await dupliquerSequenceAdmin(s, { acteurUid, id: 'S2', motif });
    expect(copie.id).toBe('S3');
    expect((await db.collection(collections.sequences).doc('S3').get()).data()).toMatchObject({
      nom: 'Test 2 (copie)',
      actif: false,
    });
    await basculerSequenceAdmin(s, { acteurUid, id: 'S4', actif: false, motif });
    expect((await db.collection(collections.sequences).doc('S4').get()).data()).toMatchObject({
      actif: false,
      version: 1,
    });
    expect(await audits()).toEqual([
      'adminSequenceCreer',
      'adminSequenceModifier',
      'adminSequenceCreer',
      'adminSequenceModifier',
    ]);
  });

  it('séquence en pause : aucun envoi, l’entreprise repasse le lendemain', async () => {
    await basculerSequenceAdmin(s, { acteurUid, id: 'S4', actif: false, motif });
    const envois: unknown[] = [];
    await planifierCycle({ db, horloge: () => T, notifier: async (e) => void envois.push(e) });
    expect(envois).toEqual([]);
    const etat = await db.collection(collections.cycleEtat).doc('a1').get();
    expect((etat.get('sequence.prochainEnvoi') as Timestamp).toMillis()).toBe(T + J);
  });

  it('supprimer : marquée supprimée, les entreprises basculent vers la séquence choisie', async () => {
    expect(
      await supprimerSequenceAdmin(s, {
        acteurUid,
        id: 'S4',
        devenir: 'bascule',
        versSequence: 'S5',
        motif,
      }),
    ).toEqual({ deplacees: 1 });
    expect(
      (await db.collection(collections.cycleEtat).doc('a1').get()).get('sequence'),
    ).toMatchObject({ id: 'S5', etape: 0 });
    expect((await listerSequencesAdmin(db, T)).map((x) => x.id)).not.toContain('S4');
    await expect(
      basculerSequenceAdmin(s, { acteurUid, id: 'S4', actif: true, motif }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
    expect(await audits()).toEqual(['adminSequenceSupprimer']);
  });
});

describe('fiche cycle et réglages', () => {
  it('pause, exclusion, étape forcée : audit et trace « action_admin »', async () => {
    await agirSurCycleAdmin(s, { acteurUid, artisanId: 'a1', motif, action: 'pause' });
    let f = (await lireFicheCycle(db, 'a1'))!;
    expect(f).toMatchObject({ entreprise: 'Bertrand Rénovation', score: 62, pause: { motif } });
    await agirSurCycleAdmin(s, { acteurUid, artisanId: 'a1', motif, action: 'reprendre' });
    await agirSurCycleAdmin(s, { acteurUid, artisanId: 'a1', motif, action: 'exclure' });
    await agirSurCycleAdmin(s, {
      acteurUid,
      artisanId: 'a1',
      motif,
      action: 'forcer',
      sequenceId: 'S6',
    });
    f = (await lireFicheCycle(db, 'a1'))!;
    expect(f).toMatchObject({ pause: null, exclu: true, sequence: { id: 'S6', etape: 0 } });
    expect(f.historique.map((h) => h.details.action)).toEqual([
      'forcer',
      'exclure',
      'reprendre',
      'pause',
    ]);
    await expect(
      agirSurCycleAdmin(s, {
        acteurUid,
        artisanId: 'a1',
        motif,
        action: 'forcer',
        sequenceId: 'S99',
      }),
    ).rejects.toMatchObject({ code: 'INTROUVABLE' });
  });

  it('réglages : interrupteur coupé, valeurs relues par le moteur', async () => {
    const r = await lireReglagesCycle(db);
    await enregistrerReglagesCycleAdmin(s, {
      acteurUid,
      motif,
      reglages: { ...r, actif: false, maxOffresProSemaine: 1 },
    });
    expect(await lireReglagesCycle(db)).toMatchObject({ actif: false, maxOffresProSemaine: 1 });
    expect(await audits()).toEqual(['adminReglagesCycle']);
  });

  it('journal filtré et vue d’ensemble', async () => {
    await tracer(db, T, {
      artisanId: 'a1',
      type: 'email_planifie',
      fonction: 'f',
      modele: 'vis-position',
    });
    await tracer(db, T + 1, {
      artisanId: 'a1',
      type: 'email_bloque',
      fonction: 'f',
      raison: 'pression',
    });
    await tracer(db, T + 2, {
      artisanId: 'a1',
      type: 'conversion',
      fonction: 'f',
      modele: 'vis-position',
      details: { montantHtCentimes: 7990, temoin: false },
    });
    await agregerCycleJour(db, '2026-10-06');
    expect(
      (await db.collection(collections.cycleStats).doc('2026-10-06').get()).data(),
    ).toMatchObject({
      envois: { 'vis-position': 1 },
      conversions: { 'vis-position': 1 },
      revenuAttribueCentimes: { 'vis-position': 7990 },
      entonnoir: { gratuit_actif: 1 },
      temoin: { effectif: 0, conversions: 0 },
    });
    expect(
      (await lireJournalCycle(db, { filtre: 'non_envois' })).map((t) => [t.entreprise, t.raison]),
    ).toEqual([['Bertrand Rénovation', 'pression']]);
    expect(await lireJournalCycle(db)).toHaveLength(3);
    const a = await lireApercuConversion(db, T + 10);
    expect(a).toMatchObject({
      envois: 1,
      bloques: 1,
      conversions: 1,
      parEtape: { gratuit_actif: 1 },
      revenuAttribueCentimes: 7990,
      meilleursModeles: [{ modele: 'vis-position', conversions: 1, revenuCentimes: 7990 }],
    });
  });
});
