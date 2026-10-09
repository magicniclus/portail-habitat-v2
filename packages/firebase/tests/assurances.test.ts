import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { verifierAssurances } from '../src/serveur/pro';

/** Fin de la décennale (EMAILS assurance-expire) : J-30, J-7, J0 puis fiche retirée. */
let db: Firestore;
const J = 86_400_000;
const T = Date.UTC(2026, 9, 9, 4);
const envois: { modele: string; donnees: { message: string } }[] = [];
const s = (t: number) => ({
  db,
  horloge: () => t,
  notifier: async (n: unknown) => void envois.push(n as (typeof envois)[number]),
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

const artisan = (id: string, expireLe: number) =>
  db.doc(chemins.artisan(id)).set({
    statut: 'actif',
    enLigne: true,
    proprietaireUid: `u-${id}`,
    labelsVerifies: {
      decennale: {
        verifieLe: Timestamp.fromMillis(T - 300 * J),
        docId: 'd1',
        expireLe: Timestamp.fromMillis(expireLe),
      },
    },
  });

describe('verifierAssurances', () => {
  it('J-30 puis J-7 puis J0 : un rappel par palier, puis la fiche est retirée', async () => {
    const fin = T + 30 * J;
    await artisan('a1', fin);
    await artisan('loin', T + 90 * J);
    expect(await verifierAssurances(s(T))).toEqual({ rappels: 1, retirees: 0 });
    expect(await verifierAssurances(s(T + J))).toEqual({ rappels: 0, retirees: 0 });
    expect(await verifierAssurances(s(fin - 7 * J))).toEqual({ rappels: 1, retirees: 0 });
    expect(await verifierAssurances(s(fin))).toEqual({ rappels: 1, retirees: 1 });
    const a = (await db.doc(chemins.artisan('a1')).get()).data()!;
    expect(a.enLigne).toBe(false);
    expect(a.labelsVerifies.decennale).toBeUndefined();
    expect(envois.map((e) => e.modele)).toEqual([
      'assurance-expire',
      'assurance-expire',
      'assurance-expire',
    ]);
    expect(envois[2]!.donnees.message).toContain('n’est plus visible');
    expect(await verifierAssurances(s(fin + J))).toEqual({ rappels: 0, retirees: 0 });
  });
  it('nouvelle attestation validée (nouvelle date) : les rappels repartent de zéro', async () => {
    await artisan('a2', T + 5 * J);
    await verifierAssurances(s(T));
    await db.doc(chemins.artisan('a2')).update({
      'labelsVerifies.decennale.expireLe': Timestamp.fromMillis(T + 20 * J),
    });
    expect(await verifierAssurances(s(T + J))).toEqual({ rappels: 1, retirees: 0 });
  });
});
