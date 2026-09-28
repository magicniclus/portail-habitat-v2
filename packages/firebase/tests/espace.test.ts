import { ErreurMetier } from '@ph/core/erreurs';
import { entreeMessageParticulier } from '@ph/core/schemas';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  connecterParLien,
  envoyerMessageParticulier,
  exporterMesDonnees,
  lireMaDemande,
  lireMesDemandes,
  lireProfilEspace,
  supprimerCompteParticulier,
  urlIdentite,
} from '../src/serveur/espace';

const T = Date.UTC(2026, 8, 28, 10);
let db: Firestore;
let auth: Auth;
const lecture = () => ({
  db,
  nomPrestation: (id: string) => (id === 'sdb' ? 'Salle de bain' : id),
});

beforeAll(() => {
  db = getFirestore(appAdmin());
  auth = getAuth(appAdmin());
});

beforeEach(async () => {
  await Promise.all([
    fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
      { method: 'DELETE' },
    ),
    fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/accounts`,
      { method: 'DELETE' },
    ),
  ]);
});

async function demande(id: string, uid: string, autres: Record<string, unknown> = {}) {
  await db.doc(chemins.demande(id)).set({
    reference: `PH-${id.toUpperCase().padEnd(6, 'X').slice(0, 6)}`,
    particulierUid: uid,
    prestationId: 'sdb',
    adresseChantier: { ville: 'Bordeaux', codePostal: '33000' },
    statut: 'devis_recus',
    estimation: { minCentimes: 780_000, maxCentimes: 1_040_000 },
    contact: { prenom: 'Camille', nom: 'Martin', email: 'c@test.local', telephone: '+33612345678' },
    reponsesLisibles: [{ question: 'Surface', reponse: '6 m²' }],
    ipHash: 'abcd',
    createdAt: Timestamp.fromMillis(T),
    ...autres,
  });
}

async function attribution(demandeId: string, artisanId: string, statut: string, devis?: number) {
  await db.doc(chemins.artisanPublic(artisanId)).set({
    nomCommercial: `Artisan ${artisanId}`,
    slug: artisanId,
    noteMoyenne: 4.8,
    nbAvis: 12,
  });
  await db.doc(chemins.attribution(demandeId, artisanId)).set({
    artisanId,
    demandeId,
    statut,
    ...(devis ? { devis: { montantCentimes: devis } } : {}),
  });
}

describe('lecture de l’espace particulier', () => {
  it('ESP-01 : mes demandes, avec statut, nombre d’artisans et de devis', async () => {
    await demande('d1', 'u1');
    await attribution('d1', 'a1', 'devis_envoye', 924_000);
    await attribution('d1', 'a2', 'vue');
    await attribution('d1', 'a3', 'refusee');
    await demande('d2', 'u2');
    const r = await lireMesDemandes(lecture(), 'u1');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      id: 'd1',
      titre: 'Salle de bain',
      ville: 'Bordeaux',
      statut: 'devis_recus',
      nbArtisans: 2,
      nbDevis: 1,
      envoyeeLe: T,
    });
  });

  it('ESP-02 : la demande d’un autre est introuvable, comme une demande inexistante', async () => {
    await demande('d2', 'u2');
    for (const id of ['d2', 'inconnue'])
      await expect(lireMaDemande(lecture(), 'u1', id)).rejects.toMatchObject({
        code: 'INTROUVABLE',
      });
    const d = await lireMaDemande(lecture(), 'u2', 'd2');
    expect(d.reponsesLisibles).toEqual([{ question: 'Surface', reponse: '6 m²' }]);
  });

  it('prénom tiré de la première demande si le profil n’en a pas', async () => {
    await db.doc(chemins.user('u1')).set({ email: 'c@test.local' });
    await demande('d1', 'u1');
    expect(await lireProfilEspace(db, 'u1')).toMatchObject({ prenom: 'Camille' });
  });
});

describe('messages (ESP-03)', () => {
  const msg = (texte: string, artisanId = 'a1') =>
    entreeMessageParticulier.parse({
      cleIdempotence: 'cle-msg-0001',
      demandeId: 'd1',
      artisanId,
      texte,
    });
  let tic = 0;
  // Une heure différente par message : l'ordre du fil ne dépend pas d'une égalité.
  const s = () => ({ db, horloge: () => T + ++tic * 1000 });

  it('numéro masqué tant que l’artisan n’a pas accepté ; en clair ensuite', async () => {
    await demande('d1', 'u1');
    await attribution('d1', 'a1', 'vue');
    await attribution('d1', 'a2', 'acceptee');
    const r1 = await envoyerMessageParticulier(s(), 'u1', msg('Appelez-moi au 06 12 34 56 78'));
    expect(r1.masque).toBe(true);
    const r2 = await envoyerMessageParticulier(s(), 'u1', msg('Mon 06 12 34 56 78', 'a2'));
    expect(r2.masque).toBe(false);
    const d = await lireMaDemande(lecture(), 'u1', 'd1');
    expect(d.messages.map((m) => m.texte)).toEqual([
      'Appelez-moi au [numéro masqué]',
      'Mon 06 12 34 56 78',
    ]);
    expect(d.messages.every((m) => m.deMoi)).toBe(true);
  });

  it('refusé sur la demande d’un autre ou à un artisan qui a refusé', async () => {
    await demande('d1', 'u2');
    await attribution('d1', 'a1', 'vue');
    await expect(envoyerMessageParticulier(s(), 'u1', msg('Bonjour'))).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
    await db.doc(chemins.demande('d1')).update({ particulierUid: 'u1' });
    await attribution('d1', 'a3', 'refusee');
    await expect(envoyerMessageParticulier(s(), 'u1', msg('Bonjour', 'a3'))).rejects.toBeInstanceOf(
      ErreurMetier,
    );
  });
});

describe('connexion par lien magique', () => {
  const services = () => ({
    db,
    auth,
    horloge: () => T,
    cleApi: 'cle-test',
    urlIdentite: urlIdentite(),
  });
  const code = async (email: string) => {
    const lien = await auth.generateSignInWithEmailLink(email, {
      url: 'https://portail-habitat.test/connexion/lien',
      handleCodeInApp: true,
    });
    return new URL(lien).searchParams.get('oobCode')!;
  };

  it('nouveau visiteur : compte et profil particulier créés, adresse vérifiée', async () => {
    const r = await connecterParLien(services(), {
      email: 'nouveau@test.local',
      oobCode: await code('nouveau@test.local'),
    });
    expect(r.jetonId.length).toBeGreaterThan(20);
    const profil = (await db.doc(chemins.user(r.uid)).get()).data();
    expect(profil).toMatchObject({
      roles: ['particulier'],
      origine: 'inscription',
      emailVerifie: true,
    });
  });

  it('compte créé par une demande : adresse vérifiée au premier clic', async () => {
    const u = await auth.createUser({ email: 'demande@test.local', emailVerified: false });
    await db.doc(chemins.user(u.uid)).set({ email: 'demande@test.local', emailVerifie: false });
    const r = await connecterParLien(services(), {
      email: 'demande@test.local',
      oobCode: await code('demande@test.local'),
    });
    expect(r.uid).toBe(u.uid);
    expect((await db.doc(chemins.user(u.uid)).get()).get('emailVerifie')).toBe(true);
  });

  it('code réutilisé ou autre adresse : refus générique', async () => {
    const c = await code('x@test.local');
    await expect(
      connecterParLien(services(), { email: 'autre@test.local', oobCode: c }),
    ).rejects.toMatchObject({ code: 'NON_AUTHENTIFIE' });
    await connecterParLien(services(), { email: 'x@test.local', oobCode: c });
    await expect(
      connecterParLien(services(), { email: 'x@test.local', oobCode: c }),
    ).rejects.toMatchObject({ code: 'NON_AUTHENTIFIE' });
  });
});

describe('mes données (ESP-04)', () => {
  it('export : profil, demandes et messages, sans champ interne', async () => {
    await db.doc(chemins.user('u1')).set({ email: 'c@test.local' });
    await demande('d1', 'u1');
    await attribution('d1', 'a1', 'acceptee');
    await envoyerMessageParticulier(
      { db, horloge: () => T },
      'u1',
      entreeMessageParticulier.parse({
        cleIdempotence: 'cle-msg-0001',
        demandeId: 'd1',
        artisanId: 'a1',
        texte: 'Bonjour',
      }),
    );
    await demande('d2', 'u2');
    const x = await exporterMesDonnees(db, 'u1');
    const demandes = x.demandes as Record<string, unknown>[];
    expect(demandes).toHaveLength(1);
    expect(demandes[0]).not.toHaveProperty('ipHash');
    expect(demandes[0]!.createdAt).toBe(new Date(T).toISOString());
    expect(demandes[0]!.messages).toHaveLength(1);
  });

  it('suppression : demandes en cours annulées, compte supprimé', async () => {
    const u = await auth.createUser({ email: 's@test.local' });
    await db.doc(chemins.user(u.uid)).set({ email: 's@test.local', roles: ['particulier'] });
    await demande('d1', u.uid);
    await demande('d2', u.uid, { statut: 'close' });
    await supprimerCompteParticulier(
      { db, auth, horloge: () => T, notifier: async () => undefined },
      u.uid,
    );
    expect((await db.doc(chemins.demande('d1')).get()).get('statut')).toBe('annulee');
    expect((await db.doc(chemins.demande('d2')).get()).get('statut')).toBe('close');
    await expect(auth.getUser(u.uid)).rejects.toBeTruthy();
    expect((await db.doc(chemins.user(u.uid)).get()).get('statut')).toBe('supprime');
  });
});
