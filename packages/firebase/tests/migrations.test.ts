import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { executerMigration, type Migration } from '../src/serveur/migrations';

/** Migrations (EXPLOITATION §2) : dry-run sans écriture, lots, reprise, idempotence. */
let db: Firestore;
const horloge = () => Date.UTC(2026, 9, 9);
const m: Migration = {
  id: '001-test',
  description: 'ajoute schemaVersion',
  collection: 'essaisMigration',
  transformer: (d) => (d.schemaVersion === undefined ? { schemaVersion: 1 } : null),
};

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const lot = db.batch();
  for (let i = 0; i < 450; i++)
    lot.set(db.collection('essaisMigration').doc(`d${String(i).padStart(3, '0')}`), {
      ...(i % 10 === 0 ? { schemaVersion: 1 } : {}),
    });
  await lot.commit();
});

describe('executerMigration', () => {
  it('dry-run : compte et montre des exemples, n’écrit rien', async () => {
    const b = await executerMigration(db, m, { dryRun: true, horloge });
    expect(b).toMatchObject({ lus: 450, modifies: 405, terminee: true });
    expect(b.exemples).toHaveLength(5);
    expect((await db.doc('essaisMigration/d001').get()).get('schemaVersion')).toBeUndefined();
    expect((await db.doc('migrations/001-test').get()).exists).toBe(false);
  });
  it('exécution par lots avec reprise au curseur, puis rien à refaire', async () => {
    const premier = await executerMigration(db, m, { dryRun: false, horloge, maxLots: 1 });
    expect(premier).toMatchObject({ lus: 400, terminee: false });
    expect((await db.doc('migrations/001-test').get()).get('curseur')).toBe('d399');
    const suite = await executerMigration(db, m, { dryRun: false, horloge });
    expect(suite).toMatchObject({ lus: 50, terminee: true });
    expect((await db.doc('migrations/001-test').get()).get('traites')).toBe(450);
    expect((await db.doc('essaisMigration/d449').get()).get('schemaVersion')).toBe(1);
    expect(await executerMigration(db, m, { dryRun: false, horloge })).toMatchObject({ lus: 0 });
    expect(await executerMigration(db, m, { dryRun: true, horloge })).toMatchObject({
      modifies: 0,
    });
  });
});
