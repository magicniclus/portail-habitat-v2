import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  creerEntrepriseAdmin,
  recalculerFicheAdmin,
  supprimerEntrepriseAdmin,
  transfererProprieteAdmin,
} from '../src/serveur/admin';
import { accepterInvitation, type Notification } from '../src/serveur/comptes';

/** Back-office › Artisans : entreprise créée par l'admin, revendication, transfert, suppression. */
let db: Firestore;
let auth: Auth;
let envois: Notification[];
const SIREN = '552100554';
const services = () => ({
  db,
  auth,
  horloge: Date.now,
  notifier: async (n: Notification) => void envois.push(n),
  jeton: () => 'jeton-revendication-test',
});
const creer = (e: Record<string, unknown> = {}) =>
  creerEntrepriseAdmin(services(), {
    acteurUid: 'admin1',
    siren: SIREN,
    metierPrincipal: 'plombier',
    metiers: ['plombier'],
    rayonKm: 30,
    motif: 'Partenariat chambre des métiers',
    ...e,
  });

beforeAll(() => {
  db = getFirestore(appAdmin());
  auth = getAuth(appAdmin());
});
beforeEach(async () => {
  envois = [];
  await Promise.all([
    fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
      { method: 'DELETE' },
    ),
    fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/accounts`,
      {
        method: 'DELETE',
      },
    ),
  ]);
  // Résultat de l'API Recherche d'entreprises en cache : aucun appel réseau.
  await db.doc(`${collections.cacheSirene}/${SIREN}`).set({
    schemaVersion: 1,
    donnees: {
      siren: SIREN,
      siret: '55210055400013',
      raisonSociale: 'BERTRAND RENOVATION SARL',
      nomCommercial: 'Bertrand Rénovation',
      codeNaf: '43.22A',
      dateCreation: '2010-01-01',
      fermee: false,
      adresse: {
        ligne1: '12 rue Sainte-Catherine',
        codePostal: '33000',
        ville: 'Bordeaux',
        geo: { latitude: 44.84, longitude: -0.58 },
      },
    },
    createdAt: Timestamp.now(),
    expireLe: Timestamp.fromMillis(Date.now() + 86_400_000),
  });
});

describe('creerEntrepriseAdmin', () => {
  it('crée une entreprise non revendiquée, sans membre et hors ligne, avec audit', async () => {
    const { artisanId } = await creer();
    const a = (await db.doc(chemins.artisan(artisanId)).get()).data()!;
    expect(a).toMatchObject({
      origine: 'admin',
      source: 'admin',
      revendiquee: false,
      nbMembres: 0,
      enLigne: false,
      slug: 'bertrand-renovation-bordeaux',
    });
    expect(a.proprietaireUid).toBeUndefined();
    expect((await db.doc(`${collections.sirenIndex}/${SIREN}`).get()).get('artisanId')).toBe(
      artisanId,
    );
    const audit = await db
      .collection(collections.auditLog)
      .where('action', '==', 'adminCreerEntreprise')
      .get();
    expect(audit.docs[0]!.get('motif')).toBe('Partenariat chambre des métiers');
    await expect(creer()).rejects.toThrow('déjà présente');
  });

  it('invite le dirigeant à revendiquer : il devient propriétaire en acceptant', async () => {
    const { artisanId } = await creer({ emailDirigeant: 'dirigeant@exemple.fr' });
    expect(envois[0]).toMatchObject({
      modele: 'invitation-membre',
      donnees: { role: 'proprietaire', invitant: 'L’équipe Portail Habitat' },
    });
    const { uid } = await auth.createUser({
      email: 'dirigeant@exemple.fr',
      emailVerified: true,
      password: 'motdepasse-test',
    });
    await accepterInvitation(services(), uid, { jeton: 'jeton-revendication-test' });
    const a = (await db.doc(chemins.artisan(artisanId)).get()).data()!;
    expect(a).toMatchObject({ proprietaireUid: uid, revendiquee: true, nbMembres: 1 });
    expect((await db.doc(chemins.membre(artisanId, uid)).get()).get('role')).toBe('proprietaire');
    expect(envois.filter((e) => e.modele === 'invitation-acceptee')).toHaveLength(0);
  });
});

describe('transfert, suppression, recalcul', () => {
  const avecMembres = async () => {
    const { artisanId } = await creer();
    const ancien = (await auth.createUser({ email: 'ancien@exemple.fr' })).uid;
    const nouveau = (await auth.createUser({ email: 'nouveau@exemple.fr' })).uid;
    await db
      .doc(chemins.artisan(artisanId))
      .update({ proprietaireUid: ancien, revendiquee: true, nbMembres: 2 });
    await db.doc(chemins.membre(artisanId, ancien)).set({ role: 'proprietaire', statut: 'actif' });
    await db
      .doc(chemins.membre(artisanId, nouveau))
      .set({ role: 'collaborateur', statut: 'actif' });
    return { artisanId, ancien, nouveau };
  };

  it('transfère la propriété à un membre actif ; l’ancien propriétaire devient gérant', async () => {
    const { artisanId, ancien, nouveau } = await avecMembres();
    await transfererProprieteAdmin(services(), {
      acteurUid: 'admin1',
      artisanId,
      uid: nouveau,
      motif: 'Kbis à jour reçu',
    });
    expect((await db.doc(chemins.artisan(artisanId)).get()).get('proprietaireUid')).toBe(nouveau);
    expect((await db.doc(chemins.membre(artisanId, nouveau)).get()).get('role')).toBe(
      'proprietaire',
    );
    expect((await db.doc(chemins.membre(artisanId, ancien)).get()).get('role')).toBe('gerant');
    await expect(
      transfererProprieteAdmin(services(), {
        acteurUid: 'admin1',
        artisanId,
        uid: 'inconnu',
        motif: 'Kbis à jour reçu',
      }),
    ).rejects.toThrow('membre actif');
  });

  it('suppression définitive : nom exact exigé, membres retirés, SIREN libéré, fiche retirée', async () => {
    const { artisanId, ancien } = await avecMembres();
    await expect(
      supprimerEntrepriseAdmin(services(), {
        acteurUid: 'admin1',
        artisanId,
        confirmation: 'Bertrand',
        motif: 'Demande du dirigeant',
      }),
    ).rejects.toThrow('exactement le nom');
    await supprimerEntrepriseAdmin(services(), {
      acteurUid: 'admin1',
      artisanId,
      confirmation: 'Bertrand Rénovation',
      motif: 'Demande du dirigeant',
    });
    const a = (await db.doc(chemins.artisan(artisanId)).get()).data()!;
    expect(a).toMatchObject({ statut: 'supprime', enLigne: false, nbMembres: 0 });
    expect((await db.doc(chemins.membre(artisanId, ancien)).get()).exists).toBe(false);
    expect((await db.doc(`${collections.sirenIndex}/${SIREN}`).get()).exists).toBe(false);
  });

  it('recalcule la fiche publique (hors ligne : retirée de l’annuaire)', async () => {
    const { artisanId } = await creer();
    expect(
      await recalculerFicheAdmin({ db, horloge: Date.now }, { acteurUid: 'admin1', artisanId }),
    ).toBe('Fiche retirée de l’annuaire (hors ligne).');
    expect(
      (
        await db
          .collection(collections.auditLog)
          .where('action', '==', 'adminRecalculerFiche')
          .get()
      ).size,
    ).toBe(1);
  });
});
