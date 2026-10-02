import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { lireEquipe } from '../src/serveur/pro';

let db: Firestore;
const T = Date.UTC(2026, 8, 29, 8);
const JOUR = 86_400_000;

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const m = (role: string) => ({ role, statut: 'actif' });
  const inv = (email: string, statut: string, expire: number) => ({
    artisanId: 'a1',
    email,
    role: 'collaborateur',
    statut,
    expireLe: Timestamp.fromMillis(expire),
  });
  await Promise.all([
    db.doc(chemins.artisan('a1')).set({ siegesMax: 3, nbMembres: 2 }),
    db.doc(chemins.membre('a1', 'p1')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'c1')).set(m('collaborateur')),
    db.doc(chemins.user('p1')).set({ nomAffiche: 'Paul Proprio', email: 'paul@test.local' }),
    db.doc(chemins.user('c1')).set({ nomAffiche: 'Chloé Collab', email: 'chloe@test.local' }),
    db.doc(`${collections.invitations}/i1`).set(inv('nouveau@test.local', 'envoyee', T + JOUR)),
    db.doc(`${collections.invitations}/i2`).set(inv('vieux@test.local', 'envoyee', T - JOUR)),
    db.doc(`${collections.invitations}/i3`).set(inv('revoque@test.local', 'revoquee', T + JOUR)),
  ]);
});

describe('lireEquipe', () => {
  it('gestionnaire : membres, invitations en cours (non expirées), sièges', async () => {
    const e = await lireEquipe(db, 'a1', { role: 'proprietaire', statut: 'actif' }, T);
    expect(e.membres.map((m) => m.nom)).toEqual(['Chloé Collab', 'Paul Proprio']);
    expect(e.membres[0]!.email).toBe('chloe@test.local');
    expect(e.invitations.map((i) => i.email)).toEqual(['nouveau@test.local']);
    expect(e.sieges).toEqual({ max: 3, utilises: 3, disponibles: 0 });
  });

  it('collaborateur (EQU-03) : adresses masquées, pas d’invitations', async () => {
    const e = await lireEquipe(db, 'a1', { role: 'collaborateur', statut: 'actif' }, T);
    expect(e.membres[1]!.email).toBe('p•••@t•••.local');
    expect(e.invitations).toEqual([]);
    expect(e.demandesAcces).toEqual([]);
  });
});
