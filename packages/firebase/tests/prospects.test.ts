import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { enregistrerProspect } from '../src/serveur/cycle';
import { empreinteEmail } from '../src/serveur/notifications';

/** Prospects (CONVERSION §3 S1) : estimation reçue par email depuis la page d'acquisition. */
let db: Firestore;
const T = Date.UTC(2026, 9, 6, 8);
const J = 86_400_000;
const bordeaux = { latitude: 44.84, longitude: -0.58 };
const envois: {
  modele: string;
  destinataire: { email?: string };
  donnees: Record<string, unknown>;
}[] = [];
const s = {
  get db() {
    return db;
  },
  horloge: () => T,
  notifier: async (e: unknown) => void envois.push(e as (typeof envois)[number]),
  geocodeur: async (cp: string) => (cp === '33000' ? { ville: 'Bordeaux', geo: bordeaux } : null),
  estimerDemandes: () => 27,
  nomMetier: (id: string) => (id === 'electricien' ? 'Électricien' : undefined),
  urlSite: 'https://ph.test',
};
const e = { email: 'marc@exemple.fr', metier: 'electricien', codePostal: '33000' };

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

describe('enregistrerProspect', () => {
  it('prospect créé avec la preuve du consentement, estimation envoyée avec les vrais chiffres', async () => {
    await db.doc(chemins.artisan('x')).set({
      metiers: ['electricien'],
      enLigne: true,
      zoneIntervention: { centre: { latitude: 44.85, longitude: -0.57 } },
    });
    await db.doc(chemins.demande('d1')).set({
      metierRequis: 'electricien',
      adresseChantier: { codePostal: '33400' },
      estimation: { minCentimes: 200_000, maxCentimes: 400_000 },
      createdAt: Timestamp.fromMillis(T - 10 * J),
    });
    await enregistrerProspect(s, e);
    const p = (
      await db.collection(collections.prospects).doc(empreinteEmail(e.email)).get()
    ).data()!;
    expect(p).toMatchObject({
      email: e.email,
      source: 'estimation',
      metiers: ['electricien'],
      commune: 'Bordeaux',
      etape: 'prospect',
      consentement: { base: 'interet_legitime_b2b' },
      desabonne: false,
    });
    expect(envois).toEqual([
      expect.objectContaining({
        modele: 'prospect-estimation',
        destinataire: { email: e.email },
        donnees: expect.objectContaining({
          metier: 'électricien',
          ville: 'Bordeaux',
          demandes30j: 27,
          inscritsZone: 1,
          budgetMoyenCentimes: 300_000,
          lien: 'https://ph.test/pro?metier=electricien#inscription',
        }),
      }),
    ]);
  });

  it('une seule fois par adresse ; rien pour une adresse qui a déjà un compte', async () => {
    await enregistrerProspect(s, e);
    await enregistrerProspect(s, e);
    expect(envois).toHaveLength(1);
    expect(envois[0]!.donnees.budgetMoyenCentimes).toBeUndefined();
    await db.doc(chemins.user('u1')).set({ email: 'deja@exemple.fr' });
    await enregistrerProspect(s, { ...e, email: 'deja@exemple.fr' });
    expect(envois).toHaveLength(1);
    expect(
      (await db.collection(collections.prospects).doc(empreinteEmail('deja@exemple.fr')).get())
        .exists,
    ).toBe(false);
  });

  it('code postal ou métier inconnus : refusés', async () => {
    await expect(enregistrerProspect(s, { ...e, codePostal: '99999' })).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
    await expect(enregistrerProspect(s, { ...e, metier: 'astronaute' })).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
  });
});
