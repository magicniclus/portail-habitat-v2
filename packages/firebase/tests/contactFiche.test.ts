import type { ErreurMetier } from '@ph/core/erreurs';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { envoyerContactFiche } from '../src/serveur/demandes';

// Fiche publique : « Laisser mes coordonnées à l'artisan » → demande attribuée directement.
let db: Firestore;
const s = () => ({
  db,
  horloge: () => Date.UTC(2026, 10, 1, 10),
  auth: getAuth(appAdmin()),
  notifier: async () => ({ ignores: {} }),
  versionLegale: '2026-09',
});
const contact = {
  artisanId: 'a1',
  prenom: 'Claire',
  nom: 'Martin',
  email: 'Claire.Fiche@test.local',
  telephone: '06 12 34 56 78',
  codePostal: '33360',
  description: 'Isolation des combles, 80 m².',
  trace: {},
};
const erreur = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('aurait dû échouer');
    },
    (e: ErreurMetier) => e,
  );

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db.doc(chemins.artisan('a1')).set({
    nomCommercial: 'Nicolas Castera',
    enLigne: true,
    statut: 'actif',
    adresseSiege: { codePostal: '33360', ville: 'Carignan-de-Bordeaux' },
    zoneIntervention: { centre: { latitude: 44.81, longitude: -0.48 }, rayonKm: 30 },
  });
});

describe('envoyerContactFiche', () => {
  it('demande attribuée directement à l’artisan, coordonnées visibles, hors appariement', async () => {
    const { demandeId, reference } = await envoyerContactFiche(s(), contact);
    expect(reference).toMatch(/^PT-/);
    const d = (await db.doc(chemins.demande(demandeId)).get()).data()!;
    expect(d).toMatchObject({
      source: 'fiche_artisan',
      statut: 'attribuee',
      artisanCibleId: 'a1',
      miseEnRelation: true,
      contact: {
        prenom: 'Claire',
        nom: 'Martin',
        email: 'claire.fiche@test.local',
        telephone: '+33612345678',
      },
      adresseChantier: { codePostal: '33360' },
      reponsesLisibles: [
        { question: 'Description du projet', reponse: 'Isolation des combles, 80 m².' },
      ],
    });
    expect((await db.doc(chemins.attribution(demandeId, 'a1')).get()).data()).toMatchObject({
      statut: 'acceptee',
      coordonneesDebloquees: true,
    });
  });

  it('fiche hors ligne ou entreprise suspendue : refusée ; téléphone invalide : refusé', async () => {
    await db.doc(chemins.artisan('a1')).update({ enLigne: false });
    expect((await erreur(envoyerContactFiche(s(), contact))).code).toBe('INTROUVABLE');
    await db.doc(chemins.artisan('a1')).update({ enLigne: true, statut: 'suspendu' });
    expect((await erreur(envoyerContactFiche(s(), contact))).code).toBe('INTROUVABLE');
    await db.doc(chemins.artisan('a1')).update({ statut: 'actif' });
    expect((await erreur(envoyerContactFiche(s(), { ...contact, telephone: '12' }))).code).toBe(
      'ENTREE_INVALIDE',
    );
    expect((await db.collection('demandes').get()).size).toBe(0);
  });
});
