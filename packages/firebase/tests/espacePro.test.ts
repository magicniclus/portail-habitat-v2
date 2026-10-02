import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { choisirEntrepriseActive, lireEspacePro, tableauDeBordPro } from '../src/serveur/comptes';

let db: Firestore;
const T = Timestamp.fromMillis(Date.UTC(2026, 8, 29, 8));

beforeAll(() => {
  db = getFirestore(appAdmin());
});

const membre = (role: string, statut = 'actif') => ({
  schemaVersion: 1,
  role,
  statut,
  notifs: { demandes: true, avis: true, factures: true },
  ajouteLe: T,
  ajoutePar: 'u1',
});
const artisan = (nom: string, extra: Record<string, unknown> = {}) => ({
  nomCommercial: nom,
  enLigne: false,
  plan: 'gratuit',
  metiers: ['couvreur'],
  metierPrincipal: 'couvreur',
  zoneIntervention: { rayonKm: 30, centre: { latitude: 44.8, longitude: -0.6 } },
  adresseSiege: { ville: 'Mérignac', codePostal: '33700', ligne1: '1 rue A' },
  description: '',
  labels: [],
  noteMoyenne: 0,
  nbAvis: 0,
  demandesRecuesMois: 0,
  ...extra,
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await Promise.all([
    db.doc(chemins.user('u1')).set({
      nomAffiche: 'Julien Bertrand',
      entreprises: ['a1', 'a2', 'a3'],
      entrepriseActive: 'a1',
      telephoneVerifie: false,
    }),
    db.doc(chemins.artisan('a1')).set(artisan('Bertrand Toiture')),
    db.doc(chemins.artisan('a2')).set(artisan('Bertrand Zinc', { enLigne: true, plan: 'premium' })),
    db.doc(chemins.artisan('a3')).set(artisan('Ancienne SARL')),
    db.doc(chemins.membre('a1', 'u1')).set(membre('proprietaire')),
    db.doc(chemins.membre('a2', 'u1')).set(membre('collaborateur')),
    db.doc(chemins.membre('a3', 'u1')).set(membre('gerant', 'suspendu')),
  ]);
});

describe('lireEspacePro', () => {
  it('entreprise active, rôle et liste pour le sélecteur', async () => {
    const e = await lireEspacePro(db, 'u1');
    expect(e.active).toMatchObject({
      artisanId: 'a1',
      membre: { role: 'proprietaire', statut: 'actif' },
      artisan: { nomCommercial: 'Bertrand Toiture', ville: 'Mérignac', rayonKm: 30 },
    });
    expect(e.entreprises.map((x) => x.nomCommercial)).toEqual([
      'Bertrand Toiture',
      'Bertrand Zinc',
      'Ancienne SARL',
    ]);
  });

  it('entreprise active dont la personne n’est plus membre actif : aucune', async () => {
    await db.doc(chemins.user('u1')).update({ entrepriseActive: 'a3' });
    expect((await lireEspacePro(db, 'u1')).active).toBeNull();
  });
});

describe('choisirEntrepriseActive (COMPTES §4.5)', () => {
  it('bascule vers une entreprise dont on est membre actif', async () => {
    await choisirEntrepriseActive(db, 'u1', 'a2');
    expect((await db.doc(chemins.user('u1')).get()).get('entrepriseActive')).toBe('a2');
  });

  it('refuse une entreprise étrangère ou un membre suspendu', async () => {
    await expect(choisirEntrepriseActive(db, 'u1', 'autre')).rejects.toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
    await expect(choisirEntrepriseActive(db, 'u1', 'a3')).rejects.toMatchObject({
      code: 'PERMISSION_REFUSEE',
    });
    expect((await db.doc(chemins.user('u1')).get()).get('entrepriseActive')).toBe('a1');
  });
});

describe('tableauDeBordPro', () => {
  it('fiche neuve : 20 %, 3 étapes restantes', async () => {
    const t = await tableauDeBordPro(db, 'a1', 'u1');
    expect(t.completude.pourcent).toBe(20);
    expect(t.miseEnLigne.restantes).toBe(3);
  });

  it('décennale envoyée, photos de réalisations publiées, téléphone vérifié', async () => {
    await db.doc(chemins.user('u1')).update({ telephoneVerifie: true });
    await db
      .collection(chemins.documents('a1'))
      .add({ type: 'decennale', statut: 'en_attente', createdAt: T });
    const photo = { url: 'x', storagePath: 'x', largeur: 1, hauteur: 1 };
    await db.collection(chemins.realisations('a1')).add({ publie: true, photos: [photo, photo] });
    await db.collection(chemins.realisations('a1')).add({ publie: true, photos: [photo] });
    await db.collection(chemins.realisations('a1')).add({ publie: false, photos: [photo] });
    const t = await tableauDeBordPro(db, 'a1', 'u1');
    expect(t.miseEnLigne.etapes.map((e) => e.fait)).toEqual([true, true, false]);
    expect(t.completude.criteres.find((c) => c.cle === 'photos')?.fait).toBe(true);
    expect(t.completude.pourcent).toBe(55);
  });

  it('la décennale la plus récente fait foi (refusée puis renvoyée)', async () => {
    await db.collection(chemins.documents('a1')).add({
      type: 'decennale',
      statut: 'refuse',
      createdAt: T,
    });
    expect((await tableauDeBordPro(db, 'a1', 'u1')).miseEnLigne.etapes[1]).toMatchObject({
      fait: false,
      libelle: 'Renvoyer votre attestation décennale',
    });
    await db.collection(chemins.documents('a1')).add({
      type: 'decennale',
      statut: 'en_attente',
      createdAt: Timestamp.fromMillis(T.toMillis() + 1000),
    });
    expect((await tableauDeBordPro(db, 'a1', 'u1')).miseEnLigne.etapes[1]?.fait).toBe(true);
  });
});
