import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { compterDemandeRecue, compterEvenementFiche } from '../src/serveur/annuaire';
import { envoyerRapportsHebdo } from '../src/serveur/pro';

/** `statsJour` (DATABASE §5) : vues, clics et demandes reçues, au jour de Paris. */
let db: Firestore;
// 9 octobre 2026, 23 h 30 UTC = 10 octobre à Paris.
const T = Date.UTC(2026, 9, 9, 23, 30);
const s = {
  get db() {
    return db;
  },
  horloge: () => T,
};

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

describe('statsJour', () => {
  it('vue, téléphone, devis et demande reçue s’ajoutent au jour de Paris', async () => {
    await db.doc(chemins.artisanPublic('a1')).set({ enLigne: true });
    expect(await compterEvenementFiche(s, { artisanId: 'a1', type: 'vue' })).toBe(true);
    await compterEvenementFiche(s, { artisanId: 'a1', type: 'vue' });
    await compterEvenementFiche(s, { artisanId: 'a1', type: 'tel' });
    await compterEvenementFiche(s, { artisanId: 'a1', type: 'devis' });
    await compterDemandeRecue(db, 'a1', T);
    expect((await db.doc(chemins.statsJour('a1', '2026-10-10')).get()).data()).toMatchObject({
      vuesFiche: 2,
      clicsTelephone: 1,
      clicsDevis: 1,
      demandesRecues: 1,
    });
  });
  it('fiche hors ligne ou inconnue : rien n’est écrit', async () => {
    await db.doc(chemins.artisanPublic('a2')).set({ enLigne: false });
    expect(await compterEvenementFiche(s, { artisanId: 'a2', type: 'vue' })).toBe(false);
    expect(await compterEvenementFiche(s, { artisanId: 'inconnu', type: 'vue' })).toBe(false);
    expect((await db.doc(chemins.statsJour('a2', '2026-10-10')).get()).exists).toBe(false);
  });
});

describe('envoyerRapportsHebdo', () => {
  it('Premium en ligne avec de l’activité : un rapport ; gratuit ou sans activité : rien', async () => {
    const lundi = Date.UTC(2026, 9, 12, 6);
    const artisan = (id: string, plan: string) =>
      db.doc(chemins.artisan(id)).set({ plan, enLigne: true, proprietaireUid: `u-${id}` });
    await artisan('p1', 'premium');
    await artisan('p2', 'premium');
    await artisan('g1', 'gratuit');
    await db.doc(chemins.statsJour('p1', '2026-10-06')).set({ vuesFiche: 12, demandesRecues: 1 });
    await db.doc(chemins.statsJour('g1', '2026-10-06')).set({ vuesFiche: 3 });
    const envois: { modele: string; donnees: { message: string } }[] = [];
    const r = await envoyerRapportsHebdo({
      db,
      horloge: () => lundi,
      notifier: async (n) => void envois.push(n as unknown as (typeof envois)[number]),
    });
    expect(r).toEqual({ envoyes: 1 });
    expect(envois[0]).toMatchObject({ modele: 'rapport-hebdo' });
    expect(envois[0]!.donnees.message).toContain('12 vues');
  });
});
