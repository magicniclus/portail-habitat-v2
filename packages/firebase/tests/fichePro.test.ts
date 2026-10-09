import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { modifierFiche } from '../src/serveur/pro';

let db: Firestore;
const T = Date.UTC(2026, 8, 29, 8);
const s = () => ({ db, horloge: () => T });
const ctx = (uid: string) => ({ artisanId: 'a1', uid });

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const m = (role: string) => ({ role, statut: 'actif' });
  await Promise.all([
    db.doc(chemins.membre('a1', 'p1')).set(m('proprietaire')),
    db.doc(chemins.membre('a1', 'c1')).set(m('collaborateur')),
    db.doc(chemins.user('p1')).set({ telephoneVerifie: true }),
    db.doc(chemins.artisan('a1')).set({
      nomCommercial: 'Bertrand Toiture',
      metiers: ['couvreur'],
      zoneIntervention: { rayonKm: 30, centre: { latitude: 44.8, longitude: -0.6 } },
      description: '',
      siteWeb: 'https://ancien.example',
      labels: [],
      proprietaireUid: 'p1',
    }),
  ]);
});

describe('modifierFiche', () => {
  it('présentation : enregistrée, complétude recalculée (métiers 20 + téléphone 15 + texte 20)', async () => {
    const r = await modifierFiche(s(), ctx('p1'), { description: 'x'.repeat(80) });
    expect(r.completude).toBe(55);
    const a = (await db.doc(chemins.artisan('a1')).get()).data()!;
    expect(a.description).toHaveLength(80);
    expect(a.completude).toBe(55);
  });

  it('coordonnées : téléphone normalisé, chaîne vide = champ retiré', async () => {
    await modifierFiche(s(), ctx('p1'), { telephonePublic: '06 12 34 56 78', siteWeb: '' });
    const a = (await db.doc(chemins.artisan('a1')).get()).data()!;
    expect(a.telephonePublic).toBe('+33612345678');
    expect(a.siteWeb).toBeUndefined();
  });

  it('devis en euros → centimes ; zone : geohash recalculé', async () => {
    await modifierFiche(s(), ctx('p1'), {
      devis: { minEuros: 1000, maxEuros: 20000 },
      zone: { centre: { latitude: 44.84, longitude: -0.64 }, rayonKm: 50 },
    });
    const a = (await db.doc(chemins.artisan('a1')).get()).data()!;
    expect([a.budgetMin, a.budgetMax]).toEqual([100_000, 2_000_000]);
    expect(a.zoneIntervention.rayonKm).toBe(50);
    expect(a.zoneIntervention.geohash).toMatch(/^[0-9b-hjkmnp-z]{10}$/);
  });

  it('collaborateur (sans fiche.modifier) : refusé', async () => {
    await expect(modifierFiche(s(), ctx('c1'), { pitch: 'x' })).rejects.toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
  });
});
