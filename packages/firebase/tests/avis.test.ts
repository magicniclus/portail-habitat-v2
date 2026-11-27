import { avis, entreeAvis } from '@ph/core/schemas';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { depuisFirestore } from '../src/conversion';
import type { Notification } from '../src/serveur/comptes';
import { deposerAvis, type ServicesAvis } from '../src/serveur/avis';

const T = Date.UTC(2026, 8, 28, 10);
let db: Firestore;
let envois: Notification[];
let s: ServicesAvis;

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db
    .doc(chemins.artisanPublic('a1'))
    .set({ nomCommercial: 'Bertrand Rénovation', enLigne: true });
  envois = [];
  s = { db, horloge: () => T, notifier: async (n) => void envois.push(n) };
});

const entree = (autres: Record<string, unknown> = {}) =>
  entreeAvis.parse({
    cleIdempotence: 'cle-avis-00001',
    artisanId: 'a1',
    note: 5,
    criteres: { qualite: 5 },
    pointsPositifs: ['Devis clair'],
    texte: 'Chantier tenu en 5 jours, très propre.',
    nomAffiche: 'Camille M.',
    email: 'camille@test.local',
    typeTravaux: 'Salle de bain',
    finChantier: '2026-05',
    certification: true,
    ...autres,
  });

describe('deposerAvis', () => {
  it('AVI-03 : avis en attente de modération, sans donnée personnelle publique', async () => {
    const { avisId } = await deposerAvis(s, entree(), { ipHash: 'ab'.repeat(8) });
    const d = depuisFirestore((await db.doc(chemins.avis(avisId)).get()).data()!) as Record<
      string,
      unknown
    >;
    expect(avis.safeParse(d).success).toBe(true);
    expect(d).toMatchObject({
      statut: 'en_attente',
      artisanId: 'a1',
      note: 5,
      nomAffiche: 'Camille M.',
      preuve: { type: 'aucune' },
    });
    expect(JSON.stringify(d)).not.toContain('camille@');
    const auteur = (await db.doc(chemins.auteurAvis(avisId)).get()).data()!;
    expect(auteur).toMatchObject({ auteurEmail: 'camille@test.local', ipHash: 'ab'.repeat(8) });
    expect(auteur.cleUnicite).toMatch(/^[0-9a-f]{64}$/);
    expect(envois[0]).toMatchObject({
      modele: 'avis-recu',
      destinataire: { email: 'camille@test.local' },
    });
  });

  it('AVI-04 : même email, même artisan, même mois → refusé', async () => {
    await deposerAvis(s, entree(), {});
    await expect(
      deposerAvis(s, entree({ email: 'CAMILLE@test.local', cleIdempotence: 'cle-avis-00002' }), {}),
    ).rejects.toMatchObject({ code: 'CONFLIT' });
    // Autre mois de chantier : accepté.
    await deposerAvis(s, entree({ finChantier: '2026-04', cleIdempotence: 'cle-avis-00003' }), {});
    expect((await db.collection(collections.avis).get()).size).toBe(2);
  });

  it('artisan inconnu ou hors ligne, mois futur : refus', async () => {
    await expect(deposerAvis(s, entree({ artisanId: 'inconnu' }), {})).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
    await expect(deposerAvis(s, entree({ finChantier: '2026-12' }), {})).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
  });
});
