import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { purgerDonneesExpirees } from '../src/serveur/support';

/** Durées de conservation (DATABASE §14) : demandes anonymisées à 3 ans, traces à 18 mois. */
let db: Firestore;
const J = 86_400_000;
const T = Date.UTC(2029, 9, 9, 1);

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

const demande = (id: string, expireLe: number) =>
  db.doc(chemins.demande(id)).set({
    particulierUid: 'u1',
    contact: { prenom: 'Camille', nom: 'Martin', email: 'c@test.local', telephone: '+33612345678' },
    precisions: 'Code porte 1234',
    photos: [{ storagePath: `demandes/${id}/p1.jpg` }],
    ipHash: 'abcd',
    prestationId: 'sdb',
    adresseChantier: { ville: 'Bordeaux', codePostal: '33000' },
    estimation: { minCentimes: 100_000, maxCentimes: 200_000 },
    statut: 'close',
    expireLe: Timestamp.fromMillis(expireLe),
  });

describe('purgerDonneesExpirees', () => {
  it('anonymise les demandes échues (une seule fois), garde les statistiques', async () => {
    await demande('vieille', T - J);
    await demande('recente', T + 100 * J);
    await db.collection(`${chemins.demande('vieille')}/messages`).add({ texte: 'Bonjour' });
    const effaces: string[] = [];
    const r = await purgerDonneesExpirees(db, T, async (c) => void effaces.push(c));
    expect(r).toMatchObject({ anonymisees: 1 });
    expect(effaces).toEqual(['demandes/vieille/p1.jpg']);
    const v = (await db.doc(chemins.demande('vieille')).get()).data()!;
    expect(v.contact.email).toBe('anonyme@anonyme.invalid');
    expect(v).not.toHaveProperty('precisions');
    expect(v).not.toHaveProperty('ipHash');
    expect(v).not.toHaveProperty('expireLe');
    expect(v).toMatchObject({
      particulierUid: null,
      photos: [],
      prestationId: 'sdb',
      statut: 'close',
    });
    expect((await db.collection(`${chemins.demande('vieille')}/messages`).get()).size).toBe(0);
    expect((await db.doc(chemins.demande('recente')).get()).get('contact.prenom')).toBe('Camille');
    expect(await purgerDonneesExpirees(db, T, async () => {})).toMatchObject({ anonymisees: 0 });
  });
  it('traces de matching : supprimées après 18 mois', async () => {
    await db.doc('matching/ancienne').set({ createdAt: Timestamp.fromMillis(T - 600 * J) });
    await db.doc('matching/recente').set({ createdAt: Timestamp.fromMillis(T - 100 * J) });
    expect(await purgerDonneesExpirees(db, T, async () => {})).toMatchObject({
      tracesSupprimees: 1,
    });
    expect((await db.doc('matching/recente').get()).exists).toBe(true);
  });
});
