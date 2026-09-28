import { ErreurMetier } from '@ph/core/erreurs';
import { entreeFinaliserOnboarding } from '@ph/core/schemas';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  accepterInvitation,
  appliquerSieges,
  demanderAcces,
  expirerInvitations,
  fermerEntreprise,
  finaliserOnboarding,
  inviterMembre,
  modifierMembre,
  quitterEntreprise,
  rattacherOuCreerParticulier,
  rechercherEntreprise,
  renvoyerInvitation,
  repondreDemandeAcces,
  retirerMembre,
  revoquerInvitation,
  supprimerMonCompte,
  transfererPropriete,
  type Notification,
  type ServicesComptes,
} from '../src/serveur/comptes';
import { dependancesEnveloppe } from '../src/serveur';

let db: Firestore;
let auth: Auth;
let envois: Notification[];
let s: ServicesComptes;

beforeAll(() => {
  db = getFirestore(appAdmin());
  auth = getAuth(appAdmin());
});

async function viderEmulateurs() {
  const fs = process.env.FIRESTORE_EMULATOR_HOST;
  const au = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await Promise.all([
    fetch(`http://${fs}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`, {
      method: 'DELETE',
    }),
    fetch(`http://${au}/emulator/v1/projects/${PROJET_EMULATEUR}/accounts`, { method: 'DELETE' }),
  ]);
}

beforeEach(async () => {
  await viderEmulateurs();
  envois = [];
  s = { db, auth, horloge: Date.now, notifier: async (n) => void envois.push(n) };
});

const compte = async (email: string, verifie = true) =>
  (await auth.createUser({ email, emailVerified: verifie, password: 'motdepasse-test' })).uid;

const onboarding = (siren = '552100554', siret = '55210055400013') =>
  entreeFinaliserOnboarding.parse({
    cleIdempotence: 'cle-onboarding-1',
    entreprise: {
      siren,
      siret,
      raisonSociale: 'BERTRAND RENOVATION SARL',
      nomCommercial: 'Bertrand Rénovation',
      adresseSiege: { ligne1: '12 rue Sainte-Catherine', codePostal: '33000', ville: 'Bordeaux' },
    },
    metierPrincipal: 'plombier',
    metiers: ['plombier', 'carreleur'],
    intentions: ['sdb-italienne'],
    zone: { centre: { latitude: 44.8378, longitude: -0.5792 }, rayonKm: 30 },
    cgvVersion: '2026-09',
  });

async function erreur(p: Promise<unknown>): Promise<ErreurMetier> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErreurMetier) return e;
    throw e;
  }
  throw new Error('Aucune erreur levée');
}

const claims = async (uid: string) => (await auth.getUser(uid)).customClaims ?? {};
const jetonDe = (n: Notification | undefined) =>
  String(n?.secrets?.lien).replace('/pro/invitation?t=', '');

/** Entreprise avec son propriétaire, et `siegesMax` posé comme le ferait le webhook Stripe. */
async function entreprise(siegesMax = 3) {
  const prop = await compte('proprio@test.local');
  const { artisanId } = await finaliserOnboarding(s, prop, onboarding());
  await db.doc(chemins.artisan(artisanId)).update({ siegesMax });
  return { prop, artisanId };
}

async function inviterEtAccepter(
  artisanId: string,
  par: string,
  email: string,
  role: 'gerant' | 'collaborateur' | 'comptable',
) {
  const uid = await compte(email);
  await inviterMembre(s, par, { cleIdempotence: `inv-${email}`, artisanId, email, role });
  await accepterInvitation(s, uid, { jeton: jetonDe(envois.at(-1)) });
  return uid;
}

describe('finaliserOnboarding (COMPTES §3.3)', () => {
  it('crée entreprise, propriétaire, portefeuille, profil, consentement, tâche, claims et email', async () => {
    const uid = await compte('proprio@test.local');
    const { artisanId, slug } = await finaliserOnboarding(s, uid, onboarding());
    expect(slug).toBe('bertrand-renovation-bordeaux');
    const a = (await db.doc(chemins.artisan(artisanId)).get()).data()!;
    expect(a).toMatchObject({
      plan: 'gratuit',
      siegesMax: 1,
      nbMembres: 1,
      enLigne: false,
      proprietaireUid: uid,
      verification: { statut: 'en_cours' },
      metierPrincipal: 'plombier',
    });
    expect(a.zoneIntervention.geohash).toHaveLength(10);
    expect((await db.doc(chemins.membre(artisanId, uid)).get()).get('role')).toBe('proprietaire');
    expect((await db.doc(chemins.portefeuille(artisanId)).get()).get('soldeCredits')).toBe(0);
    expect(
      (await db.collection(collections.sirenIndex).doc('552100554').get()).get('artisanId'),
    ).toBe(artisanId);
    const user = (await db.doc(chemins.user(uid)).get()).data()!;
    expect(user).toMatchObject({
      roles: ['artisan'],
      entreprises: [artisanId],
      entrepriseActive: artisanId,
      origine: 'onboarding_pro',
    });
    expect((await db.collection(chemins.consentements(uid)).get()).docs[0]!.get('type')).toBe(
      'cgv',
    );
    expect((await db.collection(collections.filesModeration).get()).docs[0]!.get('type')).toBe(
      'artisan_nouveau',
    );
    expect(await claims(uid)).toEqual({ roles: ['artisan'], ent: { [artisanId]: 'p' } });
    expect(envois.map((e) => e.modele)).toEqual(['bienvenue-pro']);
  });

  it('deux personnes, même SIREN, même seconde : une seule réussit (sirenIndex)', async () => {
    const [a, b] = await Promise.all([compte('a@test.local'), compte('b@test.local')]);
    const r = await Promise.allSettled([
      finaliserOnboarding(s, a, onboarding()),
      finaliserOnboarding(s, b, onboarding()),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const refus = r.find((x) => x.status === 'rejected') as PromiseRejectedResult;
    expect((refus.reason as ErreurMetier).code).toBe('CONFLIT');
    expect((await db.collection(collections.artisans).get()).size).toBe(1);
  });

  it('slug déjà pris : suffixe du SIREN', async () => {
    await finaliserOnboarding(s, await compte('a@test.local'), onboarding());
    const r = await finaliserOnboarding(
      s,
      await compte('b@test.local'),
      onboarding('732829320', '73282932000074'),
    );
    expect(r.slug).toBe('bertrand-renovation-bordeaux-9320');
  });

  it('personne déjà particulière : rôle artisan ajouté', async () => {
    const { uid } = await rattacherOuCreerParticulier(s, 'mixte@test.local');
    await auth.updateUser(uid, { emailVerified: true });
    const { artisanId } = await finaliserOnboarding(s, uid, onboarding());
    const user = (await db.doc(chemins.user(uid)).get()).data()!;
    expect(user.roles).toEqual(['particulier', 'artisan']);
    expect(await claims(uid)).toEqual({
      roles: ['particulier', 'artisan'],
      ent: { [artisanId]: 'p' },
    });
  });
});

describe('invitations (COMPTES §4.2)', () => {
  it('invitation, acceptation avec le même email, lien à usage unique', async () => {
    const { prop, artisanId } = await entreprise();
    const collab = await compte('collab@test.local');
    const { invitationId } = await inviterMembre(s, prop, {
      cleIdempotence: 'inv-1',
      artisanId,
      email: 'collab@test.local',
      role: 'collaborateur',
      metiers: ['carreleur'],
    });
    const inv = (await db.collection(collections.invitations).doc(invitationId).get()).data()!;
    const jeton = jetonDe(envois.at(-1));
    expect(inv.jetonHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(inv)).not.toContain(jeton);
    // Le jeton ne voyage que dans les secrets de l'envoi, jamais dans ses données.
    expect(JSON.stringify(envois.at(-1)!.donnees)).not.toContain(jeton);
    expect(envois.at(-1)!.donnees).toMatchObject({
      emailMasque: 'c•••@t•••.local',
      role: 'collaborateur',
    });

    await accepterInvitation(s, collab, { jeton });
    expect((await db.doc(chemins.membre(artisanId, collab)).get()).data()).toMatchObject({
      role: 'collaborateur',
      statut: 'actif',
      metiers: ['carreleur'],
    });
    expect((await db.doc(chemins.artisan(artisanId)).get()).get('nbMembres')).toBe(2);
    expect(await claims(collab)).toEqual({ roles: ['artisan'], ent: { [artisanId]: 'c' } });
    expect(envois.at(-1)).toMatchObject({
      modele: 'invitation-acceptee',
      destinataire: { uid: prop },
    });
    expect((await erreur(accepterInvitation(s, collab, { jeton }))).code).toBe('INTROUVABLE');
  });

  it('acceptée avec un autre email : refusée, adresse masquée', async () => {
    const { prop, artisanId } = await entreprise();
    const intrus = await compte('intrus@test.local');
    await inviterMembre(s, prop, {
      cleIdempotence: 'inv-1',
      artisanId,
      email: 'collab@test.local',
      role: 'collaborateur',
    });
    const e = await erreur(accepterInvitation(s, intrus, { jeton: jetonDe(envois.at(-1)) }));
    expect(e.code).toBe('PERMISSION_REFUSEE');
    expect(e.message).toContain('c•••@t•••.local');
    expect(e.message).not.toContain('collab@');
  });

  it('email non vérifié : refusée', async () => {
    const { prop, artisanId } = await entreprise();
    const uid = await compte('collab@test.local', false);
    await inviterMembre(s, prop, {
      cleIdempotence: 'inv-1',
      artisanId,
      email: 'collab@test.local',
      role: 'collaborateur',
    });
    expect((await erreur(accepterInvitation(s, uid, { jeton: jetonDe(envois.at(-1)) }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
  });

  it('sièges pleins à l’acceptation (un membre ajouté entre-temps) : refusée, message clair', async () => {
    const { prop, artisanId } = await entreprise(2);
    const a = await compte('a@test.local');
    await inviterMembre(s, prop, {
      cleIdempotence: 'inv-a',
      artisanId,
      email: 'a@test.local',
      role: 'collaborateur',
    });
    const jetonA = jetonDe(envois.at(-1));
    const b = await compte('b@test.local');
    const { demandeId } = await demanderAcces(s, b, { artisanId });
    await repondreDemandeAcces(s, prop, {
      artisanId,
      demandeId,
      accepter: true,
      role: 'comptable',
    });
    const e = await erreur(accepterInvitation(s, a, { jeton: jetonA }));
    expect(e.code).toBe('PRECONDITION');
    expect(e.message).toMatch(/équipe est complète/);
  });

  it('sièges occupés par les invitations en cours : nouvelle invitation refusée', async () => {
    const { prop, artisanId } = await entreprise(2);
    await inviterMembre(s, prop, {
      cleIdempotence: 'inv-a',
      artisanId,
      email: 'a@test.local',
      role: 'collaborateur',
    });
    const e = await erreur(
      inviterMembre(s, prop, {
        cleIdempotence: 'inv-b',
        artisanId,
        email: 'b@test.local',
        role: 'collaborateur',
      }),
    );
    expect(e.code).toBe('PRECONDITION');
  });

  it('doublons : déjà membre, invitation déjà en cours', async () => {
    const { prop, artisanId } = await entreprise();
    await inviterEtAccepter(artisanId, prop, 'collab@test.local', 'collaborateur');
    expect(
      (
        await erreur(
          inviterMembre(s, prop, {
            cleIdempotence: 'x1',
            artisanId,
            email: 'collab@test.local',
            role: 'comptable',
          }),
        )
      ).code,
    ).toBe('CONFLIT');
    await inviterMembre(s, prop, {
      cleIdempotence: 'x2',
      artisanId,
      email: 'c@test.local',
      role: 'comptable',
    });
    expect(
      (
        await erreur(
          inviterMembre(s, prop, {
            cleIdempotence: 'x3',
            artisanId,
            email: 'c@test.local',
            role: 'comptable',
          }),
        )
      ).code,
    ).toBe('CONFLIT');
  });

  it('un gérant n’invite pas de gérant ; un collaborateur n’invite personne', async () => {
    const { prop, artisanId } = await entreprise(5);
    const gerant = await inviterEtAccepter(artisanId, prop, 'g@test.local', 'gerant');
    expect(
      (
        await erreur(
          inviterMembre(s, gerant, {
            cleIdempotence: 'x1',
            artisanId,
            email: 'g2@test.local',
            role: 'gerant',
          }),
        )
      ).code,
    ).toBe('PERMISSION_REFUSEE');
    await inviterMembre(s, gerant, {
      cleIdempotence: 'x2',
      artisanId,
      email: 'c@test.local',
      role: 'collaborateur',
    });
    const collab = await compte('c@test.local');
    await accepterInvitation(s, collab, { jeton: jetonDe(envois.at(-1)) });
    expect(
      (
        await erreur(
          inviterMembre(s, collab, {
            cleIdempotence: 'x3',
            artisanId,
            email: 'd@test.local',
            role: 'comptable',
          }),
        )
      ).code,
    ).toBe('PERMISSION_REFUSEE');
  });

  it('20 invitations par jour au maximum', async () => {
    const { prop, artisanId } = await entreprise(100);
    for (let i = 0; i < 20; i++)
      await inviterMembre(s, prop, {
        cleIdempotence: `inv-${i}xxxx`,
        artisanId,
        email: `p${i}@test.local`,
        role: 'collaborateur',
      });
    expect(
      (
        await erreur(
          inviterMembre(s, prop, {
            cleIdempotence: 'inv-21xxxx',
            artisanId,
            email: 'p21@test.local',
            role: 'collaborateur',
          }),
        )
      ).code,
    ).toBe('TROP_DE_REQUETES');
  });

  it('renvoyer invalide l’ancien lien ; révoquer ; expiration planifiée', async () => {
    const { prop, artisanId } = await entreprise();
    const collab = await compte('collab@test.local');
    const { invitationId } = await inviterMembre(s, prop, {
      cleIdempotence: 'inv-1',
      artisanId,
      email: 'collab@test.local',
      role: 'collaborateur',
    });
    const ancien = jetonDe(envois.at(-1));
    await renvoyerInvitation(s, prop, { artisanId, invitationId });
    const nouveau = jetonDe(envois.at(-1));
    expect(nouveau).not.toBe(ancien);
    expect((await erreur(accepterInvitation(s, collab, { jeton: ancien }))).code).toBe(
      'INTROUVABLE',
    );
    await revoquerInvitation(s, prop, { artisanId, invitationId });
    expect((await erreur(accepterInvitation(s, collab, { jeton: nouveau }))).code).toBe(
      'INTROUVABLE',
    );

    const { invitationId: autre } = await inviterMembre(s, prop, {
      cleIdempotence: 'inv-2',
      artisanId,
      email: 'x@test.local',
      role: 'comptable',
    });
    await db
      .collection(collections.invitations)
      .doc(autre)
      .update({ expireLe: Timestamp.fromMillis(Date.now() - 1000) });
    expect(await expirerInvitations(s)).toBe(1);
    expect((await db.collection(collections.invitations).doc(autre).get()).get('statut')).toBe(
      'expiree',
    );
  });
});

describe('membres (COMPTES §4.8)', () => {
  it('le dernier propriétaire ne peut ni quitter ni supprimer son compte', async () => {
    const { prop, artisanId } = await entreprise();
    expect((await erreur(quitterEntreprise(s, prop, artisanId))).code).toBe('PRECONDITION');
    expect((await erreur(supprimerMonCompte(s, prop))).code).toBe('PRECONDITION');
    expect((await auth.getUser(prop)).uid).toBe(prop);
  });

  it('retrait pendant la session : jetons révoqués, claims retirés, demandes désassignées, écritures refusées', async () => {
    const { prop, artisanId } = await entreprise();
    const collab = await inviterEtAccepter(artisanId, prop, 'collab@test.local', 'collaborateur');
    await db
      .doc(chemins.attribution('d1', artisanId))
      .set({ artisanId, assigneA: collab, statut: 'acceptee' });
    const avant = (await auth.getUser(collab)).tokensValidAfterTime;
    // La révocation est datée à la seconde près.
    await new Promise((r) => setTimeout(r, 1100));

    await retirerMembre(s, prop, { artisanId, uid: collab });

    expect((await db.doc(chemins.membre(artisanId, collab)).get()).exists).toBe(false);
    expect((await db.doc(chemins.artisan(artisanId)).get()).get('nbMembres')).toBe(1);
    expect(
      (await db.doc(chemins.attribution('d1', artisanId)).get()).get('assigneA'),
    ).toBeUndefined();
    expect((await auth.getUser(collab)).tokensValidAfterTime).not.toBe(avant);
    expect(await claims(collab)).toEqual({ roles: [] });
    const deps = dependancesEnveloppe(() => db);
    const ctx = { uid: collab, identifiantClient: collab, appCheckVerifie: true };
    expect(await deps.verifierPermission!(ctx, 'demandes.repondre', { artisanId })).toBe(false);
  });

  it('un gérant ne retire ni le propriétaire ni un autre gérant', async () => {
    const { prop, artisanId } = await entreprise(5);
    const g1 = await inviterEtAccepter(artisanId, prop, 'g1@test.local', 'gerant');
    const g2 = await inviterEtAccepter(artisanId, prop, 'g2@test.local', 'gerant');
    expect((await erreur(retirerMembre(s, g1, { artisanId, uid: prop }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
    expect((await erreur(retirerMembre(s, g1, { artisanId, uid: g2 }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
    expect((await erreur(retirerMembre(s, g1, { artisanId, uid: g1 }))).code).toBe('PRECONDITION');
    await quitterEntreprise(s, g1, artisanId);
    expect(await claims(g1)).toEqual({ roles: [] });
  });

  it('modifier : rôle et métiers ; un gérant ne promeut pas au rang de gérant', async () => {
    const { prop, artisanId } = await entreprise(5);
    const g = await inviterEtAccepter(artisanId, prop, 'g@test.local', 'gerant');
    const c = await inviterEtAccepter(artisanId, prop, 'c@test.local', 'collaborateur');
    expect((await erreur(modifierMembre(s, g, { artisanId, uid: c, role: 'gerant' }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
    await modifierMembre(s, g, { artisanId, uid: c, metiers: ['plombier'], plafondCreditsMois: 5 });
    await modifierMembre(s, prop, {
      artisanId,
      uid: c,
      role: 'comptable',
      plafondCreditsMois: null,
    });
    const m = (await db.doc(chemins.membre(artisanId, c)).get()).data()!;
    expect(m).toMatchObject({ role: 'comptable', metiers: ['plombier'] });
    expect(m.plafondCreditsMois).toBeUndefined();
    expect(await claims(c)).toEqual({ roles: ['artisan'], ent: { [artisanId]: 'x' } });
    expect(
      (await erreur(modifierMembre(s, prop, { artisanId, uid: prop, metiers: [] }))).code,
    ).toBe('PRECONDITION');
  });

  it('transfert de propriété : double authentification du destinataire exigée', async () => {
    const { prop, artisanId } = await entreprise(5);
    const g = await inviterEtAccepter(artisanId, prop, 'g@test.local', 'gerant');
    expect((await erreur(transfererPropriete(s, prop, { artisanId, uid: g }))).code).toBe(
      'PRECONDITION',
    );
    await auth.updateUser(g, {
      multiFactor: {
        enrolledFactors: [{ uid: 'mfa-1', factorId: 'phone', phoneNumber: '+33612345678' }],
      },
    });
    expect((await erreur(transfererPropriete(s, g, { artisanId, uid: prop }))).code).toBe(
      'PERMISSION_REFUSEE',
    );
    await transfererPropriete(s, prop, { artisanId, uid: g });
    expect((await db.doc(chemins.artisan(artisanId)).get()).get('proprietaireUid')).toBe(g);
    expect(await claims(g)).toEqual({ roles: ['artisan'], ent: { [artisanId]: 'p' } });
    expect(await claims(prop)).toEqual({ roles: ['artisan'], ent: { [artisanId]: 'g' } });
    await quitterEntreprise(s, prop, artisanId);
  });

  it('Premium résilié avec 4 membres → 3 suspendus, aucune donnée perdue, réactivation intacte', async () => {
    const { prop, artisanId } = await entreprise(4);
    const autres = [
      await inviterEtAccepter(artisanId, prop, 'g@test.local', 'gerant'),
      await inviterEtAccepter(artisanId, prop, 'c@test.local', 'collaborateur'),
      await inviterEtAccepter(artisanId, prop, 'x@test.local', 'comptable'),
    ];
    const r = await appliquerSieges(s, artisanId, 1);
    expect(r.suspendus.sort()).toEqual([...autres].sort());
    for (const uid of autres) {
      expect((await db.doc(chemins.membre(artisanId, uid)).get()).get('statut')).toBe('suspendu');
      expect((await claims(uid)).ent).toBeUndefined();
    }
    expect((await claims(prop)).ent).toEqual({ [artisanId]: 'p' });
    await appliquerSieges(s, artisanId, 4);
    for (const uid of autres)
      expect((await db.doc(chemins.membre(artisanId, uid)).get()).get('statut')).toBe('actif');
    expect((await claims(autres[1]!)).ent).toEqual({ [artisanId]: 'c' });
  });
});

describe('demandes d’accès (COMPTES §4.4)', () => {
  it('prévient propriétaire et gérants par uid, refus possible, doublon refusé', async () => {
    const { prop, artisanId } = await entreprise();
    const d = await compte('d@test.local');
    const { demandeId } = await demanderAcces(s, d, {
      artisanId,
      message: 'Je suis le frère du gérant',
    });
    expect(envois.at(-1)).toMatchObject({ modele: 'demande-acces', destinataire: { uid: prop } });
    expect(JSON.stringify(envois.at(-1))).not.toContain('proprio@');
    expect((await erreur(demanderAcces(s, d, { artisanId }))).code).toBe('CONFLIT');
    await repondreDemandeAcces(s, prop, { artisanId, demandeId, accepter: false });
    expect(envois.at(-1)).toMatchObject({
      modele: 'demande-acces-reponse',
      donnees: { acceptee: false },
    });
    expect((await db.doc(chemins.membre(artisanId, d)).get()).exists).toBe(false);
  });
});

describe('suppression (COMPTES §4.9)', () => {
  it('supprimer son compte : retiré des équipes, profil anonymisé, compte Auth supprimé', async () => {
    const { prop, artisanId } = await entreprise();
    const c = await inviterEtAccepter(artisanId, prop, 'c@test.local', 'collaborateur');
    await supprimerMonCompte(s, c);
    expect((await db.doc(chemins.membre(artisanId, c)).get()).exists).toBe(false);
    const u = (await db.doc(chemins.user(c)).get()).data()!;
    expect(u).toMatchObject({ statut: 'supprime', entreprises: [] });
    expect(u.email).not.toContain('c@test.local');
    await expect(auth.getUser(c)).rejects.toThrow();
  });

  it('fermer l’entreprise : confirmation exacte, membres retirés et prévenus, fiche retirée', async () => {
    const { prop, artisanId } = await entreprise();
    const c = await inviterEtAccepter(artisanId, prop, 'c@test.local', 'collaborateur');
    expect(
      (await erreur(fermerEntreprise(s, prop, { artisanId, confirmation: 'Bertrand' }))).code,
    ).toBe('ENTREE_INVALIDE');
    expect(
      (await erreur(fermerEntreprise(s, c, { artisanId, confirmation: 'Bertrand Rénovation' })))
        .code,
    ).toBe('PERMISSION_REFUSEE');
    await fermerEntreprise(s, prop, { artisanId, confirmation: 'Bertrand Rénovation' });
    expect((await db.doc(chemins.artisan(artisanId)).get()).get('statut')).toBe('supprime');
    expect((await db.collection(chemins.membres(artisanId)).get()).empty).toBe(true);
    expect(envois.filter((e) => e.modele === 'entreprise-fermee')).toHaveLength(2);
    expect(await claims(c)).toEqual({ roles: [] });
    await supprimerMonCompte(s, prop);
  });
});

describe('demande sans compte (COMPTES §2)', () => {
  it('email existant : rattachée au même compte, sans connexion ni jeton', async () => {
    const uid = await compte('client@test.local');
    const r = await rattacherOuCreerParticulier(s, 'client@test.local');
    expect(r).toEqual({ uid, cree: false });
    expect(Object.keys(r)).toEqual(['uid', 'cree']);
  });
  it('email inconnu : compte créé côté serveur, email non vérifié', async () => {
    const r = await rattacherOuCreerParticulier(s, 'nouveau@test.local');
    expect(r.cree).toBe(true);
    expect((await auth.getUser(r.uid)).emailVerified).toBe(false);
    expect((await db.doc(chemins.user(r.uid)).get()).data()).toMatchObject({
      roles: ['particulier'],
      origine: 'demande',
      emailVerifie: false,
    });
  });
});

describe('rechercherEntreprise (COMPTES §3.1)', () => {
  const resultat = {
    siren: '552100554',
    nom_raison_sociale: 'BERTRAND RENOVATION',
    activite_principale: '43.22A',
    date_creation: '2012-05-01',
    etat_administratif: 'A',
    siege: {
      siret: '55210055400013',
      adresse: '12 RUE SAINTE-CATHERINE',
      code_postal: '33000',
      libelle_commune: 'BORDEAUX',
    },
  };
  function faux(reponse: unknown, ok = true) {
    const appels: string[] = [];
    const f = (async (url: string) => {
      appels.push(url);
      return { ok, json: async () => reponse } as Response;
    }) as unknown as typeof fetch;
    return { appels, f };
  }

  it('SIREN : API puis cache 24 h ; entreprise déjà revendiquée signalée', async () => {
    const { appels, f } = faux({ results: [resultat, { siren: 'invalide' }] });
    const r1 = await rechercherEntreprise({ ...s, fetch: f }, '552 100 554');
    expect(r1).toHaveLength(1);
    expect(r1[0]!.analyse).toEqual({
      refusee: false,
      horsBatiment: false,
      recente: false,
      inscription: 'libre',
    });
    expect(appels[0]).toContain('q=552%20100%20554');

    const { artisanId } = await finaliserOnboarding(s, await compte('p@test.local'), onboarding());
    const r2 = await rechercherEntreprise({ ...s, fetch: f }, '552100554');
    expect(appels).toHaveLength(1);
    expect(r2[0]).toMatchObject({ artisanId, analyse: { inscription: 'revendiquee' } });

    await db.doc(chemins.artisan(artisanId)).update({ revendiquee: false });
    expect(
      (await rechercherEntreprise({ ...s, fetch: f }, '552100554'))[0]!.analyse.inscription,
    ).toBe('non_revendiquee');
  });

  it('recherche par nom : pas de cache, entreprise fermée refusée', async () => {
    const { appels, f } = faux({ results: [{ ...resultat, etat_administratif: 'C' }] });
    await rechercherEntreprise({ ...s, fetch: f }, 'bertrand');
    const r = await rechercherEntreprise({ ...s, fetch: f }, 'bertrand');
    expect(appels).toHaveLength(2);
    expect(r[0]!.analyse.refusee).toBe(true);
  });

  it('API indisponible ou réponse inattendue : INDISPONIBLE', async () => {
    expect(
      (await erreur(rechercherEntreprise({ ...s, fetch: faux({}, false).f }, 'x y'))).code,
    ).toBe('INDISPONIBLE');
    expect(
      (await erreur(rechercherEntreprise({ ...s, fetch: faux({ autre: 1 }).f }, 'x y'))).code,
    ).toBe('INDISPONIBLE');
    const panne = (async () => {
      throw new Error('réseau');
    }) as unknown as typeof fetch;
    expect((await erreur(rechercherEntreprise({ ...s, fetch: panne }, 'x y'))).code).toBe(
      'INDISPONIBLE',
    );
  });
});
