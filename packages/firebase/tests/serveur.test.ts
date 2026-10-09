import { membre } from '@ph/core/schemas';
import { GeoPoint, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { depuisFirestore, versFirestore } from '../src/conversion';
import { convertisseur, dependancesEnveloppe, depot } from '../src/serveur';

let db: Firestore;
const ctx = (uid: string | null) => ({
  uid,
  identifiantClient: uid ?? 'ip:abc',
  appCheckVerifie: true,
});
const date = new Date('2026-09-27T10:00:00Z');

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await Promise.all(
    [collections.rateLimits, collections.auditLog, collections.idempotence].map(async (c) => {
      const docs = await db.collection(c).listDocuments();
      await Promise.all(docs.map((d) => d.delete()));
    }),
  );
  const m = (role: string, statut = 'actif') => ({
    schemaVersion: 1,
    role,
    statut,
    notifs: { demandes: true, avis: true, factures: true },
    ajouteLe: date,
    ajoutePar: 'prop',
  });
  await Promise.all([
    db.doc(chemins.membre('a1', 'prop')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'collab')).set(m('collaborateur')),
    db.doc(chemins.membre('a1', 'susp')).set(m('gerant', 'suspendu')),
    db
      .doc(chemins.admin('adm'))
      .set({ actif: true, permissionsEffectives: ['leads.prix', 'avis.moderer'] }),
    db.doc(chemins.admin('ancien')).set({ actif: false, permissionsEffectives: ['leads.prix'] }),
  ]);
});

describe('conversion Firestore', () => {
  it('Timestamp → Date et GeoPoint → objet, récursivement', () => {
    const lu = depuisFirestore({
      a: Timestamp.fromDate(date),
      b: [{ g: new GeoPoint(44.8, -0.5) }],
      c: 'x',
    });
    expect(lu).toEqual({ a: date, b: [{ g: { latitude: 44.8, longitude: -0.5 } }], c: 'x' });
  });
  it('objet { latitude, longitude } → GeoPoint, undefined retiré', () => {
    const ecrit = versFirestore(
      { geo: { latitude: 1, longitude: 2 }, vide: undefined, n: 3 },
      (lat, lng) => new GeoPoint(lat, lng),
    ) as Record<string, unknown>;
    expect(ecrit.geo).toBeInstanceOf(GeoPoint);
    expect('vide' in ecrit).toBe(false);
  });
});

describe('dépôt validé par Zod', () => {
  it('écrit et relit un membre (dates restituées)', async () => {
    const membres = depot(db, chemins.membres('a2'), membre);
    await membres.ecrire('u9', {
      schemaVersion: 1,
      role: 'collaborateur',
      statut: 'actif',
      notifs: { demandes: true, avis: false, factures: false },
      ajouteLe: date,
      ajoutePar: 'prop',
    });
    const lu = await membres.lire('u9');
    expect(lu?.ajouteLe).toEqual(date);
    expect(lu?.role).toBe('collaborateur');
  });
  it('refuse d’écrire un document invalide', async () => {
    const membres = depot(db, chemins.membres('a2'), membre);
    await expect(membres.ecrire('u10', { role: 'roi' } as never)).rejects.toThrow();
  });
  it('refuse de relire un document devenu invalide', async () => {
    await db.doc(chemins.membre('a2', 'casse')).set({ role: 'inconnu' });
    await expect(
      db
        .doc(chemins.membre('a2', 'casse'))
        .withConverter(convertisseur(membre))
        .get()
        .then((d) => d.data()),
    ).rejects.toThrow();
  });
});

describe('dépendances de l’enveloppe', () => {
  const deps = dependancesEnveloppe(() => db);

  it('permission d’équipe : lue dans membres/{uid} avec peut()', async () => {
    expect(await deps.verifierPermission!(ctx('prop'), 'membres.gerer', { artisanId: 'a1' })).toBe(
      true,
    );
    expect(
      await deps.verifierPermission!(ctx('collab'), 'membres.gerer', { artisanId: 'a1' }),
    ).toBe(false);
    expect(await deps.verifierPermission!(ctx('susp'), 'fiche.modifier', { artisanId: 'a1' })).toBe(
      false,
    );
    expect(
      await deps.verifierPermission!(ctx('inconnu'), 'fiche.modifier', { artisanId: 'a1' }),
    ).toBe(false);
    expect(await deps.verifierPermission!(ctx('prop'), 'fiche.modifier', {})).toBe(false);
    expect(await deps.verifierPermission!(ctx(null), 'fiche.modifier', { artisanId: 'a1' })).toBe(
      false,
    );
  });

  it('permission d’équipe interne : lue dans admins/{uid}', async () => {
    expect(await deps.verifierPermission!(ctx('adm'), 'leads.prix', {})).toBe(true);
    expect(await deps.verifierPermission!(ctx('adm'), 'equipe.gerer', {})).toBe(false);
    expect(await deps.verifierPermission!(ctx('ancien'), 'leads.prix', {})).toBe(false);
    expect(await deps.verifierPermission!(ctx('adm'), 'permission.inventee', {})).toBe(false);
  });

  it('limite de débit : exactement `max` requêtes passent, même en parallèle', async () => {
    const regle = { cle: 'test', max: 3, fenetre: '1h' } as const;
    const resultats = await Promise.all(
      Array.from({ length: 6 }, () => deps.limiterDebit!(regle, 'ip:1')),
    );
    expect(resultats.filter(Boolean)).toHaveLength(3);
    expect(await deps.limiterDebit!(regle, 'ip:2')).toBe(true);
    // Six transactions en concurrence sur le même compteur : l'émulateur les sérialise.
  }, 20_000);

  it('limite de débit : nouvelle fenêtre une fois la précédente écoulée', async () => {
    let t = Date.parse('2026-09-27T10:00:00Z');
    const d = dependancesEnveloppe(
      () => db,
      () => t,
    );
    const regle = { cle: 'fenetre', max: 1, fenetre: '1m' } as const;
    expect(await d.limiterDebit!(regle, 'u')).toBe(true);
    expect(await d.limiterDebit!(regle, 'u')).toBe(false);
    t += 61_000;
    expect(await d.limiterDebit!(regle, 'u')).toBe(true);
  });

  it('audit : une entrée par action, sans donnée personnelle', async () => {
    await deps.auditer!(ctx('adm'), {
      action: 'leads.prix',
      ok: false,
      code: 'PERMISSION_REFUSEE',
    });
    const docs = (await db.collection(collections.auditLog).get()).docs.map((d) => d.data());
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      acteurUid: 'adm',
      action: 'leads.prix',
      ok: false,
      code: 'PERMISSION_REFUSEE',
    });
  });

  it('idempotence : relit le résultat pendant 24 h, puis l’oublie', async () => {
    let t = Date.parse('2026-09-27T10:00:00Z');
    const d = dependancesEnveloppe(
      () => db,
      () => t,
    );
    await d.idempotence!.ecrire('x:u:1', { ok: true, data: { id: 'a' } });
    expect(await d.idempotence!.lire('x:u:1')).toEqual({ ok: true, data: { id: 'a' } });
    expect(await d.idempotence!.lire('x:u:2')).toBeUndefined();
    t += 86_400_001;
    expect(await d.idempotence!.lire('x:u:1')).toBeUndefined();
  });
});
