import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  lirePublicationFacebook,
  lireResultatsFacebook,
  marquerPublicationFacebook,
} from '../src/serveur/admin';

/** Admin › Appels d'offres › Facebook et invendues (CONV-08). */
let db: Firestore;
const T = Date.UTC(2026, 8, 26, 6);
const H = 3_600_000;

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db.doc(chemins.prestationItem('pac')).set({ nom: 'Pompe à chaleur air-eau' });
  for (let i = 0; i < 6; i++)
    await db.doc(chemins.demande(`d${i}`)).set({
      prestationId: 'pac',
      contact: { nom: 'Jeanne Martin', telephone: '+33612345678', email: 'jeanne@exemple.fr' },
      adresseChantier: {
        codePostal: i < 5 ? '33400' : '75011',
        ville: i < 5 ? 'Talence' : 'Paris',
      },
      estimation: { minCentimes: 720_000 + i, maxCentimes: 960_000 + i },
      delaiSouhaite: '1mois',
      createdAt: Timestamp.fromMillis(T - (i + 1) * H),
    });
});

describe('publication Facebook du jour', () => {
  it('CONV-08 : département le plus fourni, aucune donnée personnelle, lien utm du groupe', async () => {
    const p = await lirePublicationFacebook(db, T);
    expect(p.departements).toEqual([
      { code: '33', demandes: 5 },
      { code: '75', demandes: 1 },
    ]);
    expect(p.texte).toContain('Demandes de travaux du jour – département 33');
    expect(p.texte).toContain('• Pompe à chaleur air-eau · Talence');
    expect(p.texte).toContain(
      'utm_source=facebook&utm_medium=groupe&utm_campaign=trouver-chantier',
    );
    expect(p.texte).not.toMatch(/Jeanne|Martin|612345678|jeanne@/);
    expect((await lirePublicationFacebook(db, T, '75')).texte).toBeNull();
  });

  it('marquer comme publiée : trace d’audit datée', async () => {
    await marquerPublicationFacebook(
      { db, horloge: () => T },
      { acteurUid: 'adm', departement: '33' },
    );
    expect((await lirePublicationFacebook(db, T + H)).derniere).toBe(T);
  });

  it('résultats : prospects du groupe et demandes offertes', async () => {
    await db
      .collection(collections.prospects)
      .doc('p1')
      .set({
        source: 'facebook',
        createdAt: Timestamp.fromMillis(T - 2 * H),
      });
    await db.doc(chemins.appelOffres('ao1')).set({
      demandeId: 'd0',
      offerteLe: Timestamp.fromMillis(T - H),
      offerteA: ['a', 'b'],
      nbDeblocages: 1,
    });
    expect(await lireResultatsFacebook(db, T)).toEqual({
      prospects: 1,
      demandesOffertes: 0,
      demandesOffertesRecues: 0,
      offertes: [
        {
          appelOffresId: 'ao1',
          projet: 'Pompe à chaleur air-eau',
          lieu: 'Talence',
          proposees: 2,
          recues: 1,
        },
      ],
    });
  });
});
