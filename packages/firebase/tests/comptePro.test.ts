import { ErreurMetier } from '@ph/core/erreurs';
import { PREFERENCES_PRO_DEFAUT } from '@ph/core/espace-pro';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import type { Notification, ServicesComptes } from '../src/serveur/comptes';
import {
  changerEmailPro,
  lireComptePro,
  modifierNotifsPro,
  modifierProfilPro,
  synchroniserComptePro,
} from '../src/serveur/pro';

let db: Firestore;
let auth: Auth;
let envois: Notification[];
let s: ServicesComptes & { urlSite: string; versionLegale: string };
let uid: string;

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
  envois = [];
  s = {
    db,
    auth,
    horloge: Date.now,
    notifier: async (n) => void envois.push(n),
    urlSite: 'https://portailhabitat.test',
    versionLegale: '2026-09',
  };
  uid = (
    await auth.createUser({
      email: 'paul@test.local',
      emailVerified: true,
      password: 'motdepasse-test',
      displayName: 'Paul Proprio',
    })
  ).uid;
  await Promise.all([
    db.doc(chemins.user(uid)).set({
      email: 'paul@test.local',
      emailVerifie: true,
      mfaActive: false,
      fournisseurs: ['password'],
      entreprises: ['a1'],
      entrepriseActive: 'a1',
    }),
    db.doc(chemins.artisan('a1')).set({ nomCommercial: 'Bertrand Rénovation', statut: 'actif' }),
    db.doc(chemins.membre('a1', uid)).set({ role: 'proprietaire', statut: 'actif' }),
  ]);
});

describe('lireComptePro', () => {
  it('profil depuis Auth, défauts des notifications, suppression bloquée (seul propriétaire)', async () => {
    const c = await lireComptePro(s, uid, 'a1');
    expect(c.profil).toMatchObject({ prenom: 'Paul', nom: 'Proprio', email: 'paul@test.local' });
    expect(c.connexion).toEqual({ motDePasse: true, google: null });
    expect(c.facteurs).toEqual([]);
    expect(c.notifs).toEqual(PREFERENCES_PRO_DEFAUT);
    expect(c.entreprise).toEqual({
      nom: 'Bertrand Rénovation',
      notifs: { demandes: true, avis: true, factures: true },
    });
    expect(c.suppressionBloquee).toBe(true);
  });

  it('second facteur SMS : numéro masqué seulement', async () => {
    await auth.updateUser(uid, {
      multiFactor: {
        enrolledFactors: [{ uid: 'f1', factorId: 'phone', phoneNumber: '+33612345648' }],
      },
    });
    const c = await lireComptePro(s, uid, null);
    expect(c.facteurs).toEqual([
      expect.objectContaining({ type: 'sms', telephoneMasque: '06 12 •• •• 48' }),
    ]);
    expect(JSON.stringify(c)).not.toContain('+33612345648');
    expect(c.entreprise).toBeNull();
  });
});

describe('modifierProfilPro', () => {
  it('prénom, nom, nom affiché et Auth ; nouveau téléphone non vérifié', async () => {
    await modifierProfilPro(s, uid, {
      prenom: 'Julien',
      nom: 'Bertrand',
      telephone: '+33612345678',
    });
    const u = await db.doc(chemins.user(uid)).get();
    expect(u.get('nomAffiche')).toBe('Julien Bertrand');
    expect(u.get('telephone')).toBe('+33612345678');
    expect(u.get('telephoneVerifie')).toBe(false);
    expect((await auth.getUser(uid)).displayName).toBe('Julien Bertrand');
    await modifierProfilPro(s, uid, { prenom: 'Julien', nom: 'Bertrand', telephone: '' });
    expect((await db.doc(chemins.user(uid)).get()).get('telephone')).toBeUndefined();
  });
});

describe('changerEmailPro', () => {
  it('lien à la nouvelle adresse, alerte masquée à l’ancienne', async () => {
    await changerEmailPro(s, uid, { email: 'julien@test.local' });
    expect(envois.map((e) => [e.modele, e.destinataire.email])).toEqual([
      ['changement-email-verifier', 'julien@test.local'],
      ['changement-email-alerte', 'paul@test.local'],
    ]);
    expect(envois[1]!.donnees).toEqual({ nouvelEmailMasque: 'j•••@t•••.local' });
    expect(envois[0]!.secrets?.lien).toBeTruthy();
  });

  it('adresse déjà utilisée : refus sans détail', async () => {
    await auth.createUser({ email: 'autre@test.local' });
    await expect(changerEmailPro(s, uid, { email: 'autre@test.local' })).rejects.toBeInstanceOf(
      ErreurMetier,
    );
    expect(envois).toEqual([]);
  });
});

describe('synchroniserComptePro', () => {
  it('second facteur ajouté puis retiré : mfaActive recopié et emails de sécurité', async () => {
    await auth.updateUser(uid, {
      multiFactor: {
        enrolledFactors: [{ uid: 'f1', factorId: 'phone', phoneNumber: '+33612345648' }],
      },
    });
    await synchroniserComptePro(s, uid);
    expect((await db.doc(chemins.user(uid)).get()).get('mfaActive')).toBe(true);
    await synchroniserComptePro(s, uid);
    await auth.updateUser(uid, { multiFactor: { enrolledFactors: null } });
    await synchroniserComptePro(s, uid);
    expect(envois.map((e) => e.modele)).toEqual(['2fa-activee', '2fa-desactivee']);
  });

  it('téléphone vérifié quand le numéro du compte Auth est le même', async () => {
    await db.doc(chemins.user(uid)).update({ telephone: '+33612345678' });
    await auth.updateUser(uid, { phoneNumber: '+33612345678' });
    await synchroniserComptePro(s, uid);
    const u = await db.doc(chemins.user(uid)).get();
    expect(u.get('telephoneVerifie')).toBe(true);
    expect(u.get('fournisseurs')).toEqual(['password', 'telephone']);
  });
});

describe('modifierNotifsPro', () => {
  it('canaux inutiles coupés, entreprise, consentements journalisés', async () => {
    const tout = { email: true, sms: true, inapp: true };
    await modifierNotifsPro(s, uid, 'a1', {
      preferences: {
        activite: tout,
        relance: tout,
        offres_pro: { ...tout, email: false },
        marketing: tout,
      },
      entreprise: { demandes: true, avis: false, factures: true },
    });
    const u = await db.doc(chemins.user(uid)).get();
    expect(u.get('preferences.notifs.marketing')).toEqual({
      email: true,
      sms: false,
      inapp: false,
    });
    expect((await db.doc(chemins.membre('a1', uid)).get()).get('notifs.avis')).toBe(false);
    const c = await db.collection(chemins.consentements(uid)).get();
    expect(c.docs.map((d) => [d.get('type'), d.get('valeur')]).sort()).toEqual([
      ['marketing_email', true],
      ['opposition_offres_pro', true],
    ]);
  });
});
