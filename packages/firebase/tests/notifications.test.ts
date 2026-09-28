import type { Timestamp} from 'firebase-admin/firestore';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import {
  annulerEnvoi,
  appliquerEvenement,
  desabonner,
  empreinteEmail,
  lireEnvoi,
  marquerEnvoye,
  notifier,
  noterEchec,
  signerJeton,
  verifierJeton,
  type ServicesNotifications,
} from '../src/serveur/notifications';
import { nouvelUtilisateur } from '../src/serveur/comptes/utilisateurs';

let db: Firestore;
let taches: { envoiId: string; envoyerLe: Date; secrets: Record<string, string> }[];
let s: ServicesNotifications;
const LUNDI_14H = Date.UTC(2026, 8, 28, 12, 0);

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  taches = [];
  s = { db, horloge: () => LUNDI_14H, planifier: async (t) => void taches.push(t) };
  await db.doc(chemins.user('u1')).set({
    ...nouvelUtilisateur({
      email: 'camille@test.local',
      roles: ['particulier'],
      origine: 'inscription',
      fournisseurs: ['lien'],
      emailVerifie: true,
      maintenant: new Date(LUNDI_14H),
    }),
    telephone: '+33612345678',
    telephoneVerifie: true,
  });
});

const lien = { lien: 'https://portailhabitat.fr/connexion?t=SECRET-XYZ' };

describe('notifier() (EMAILS §1 et §8)', () => {
  it('écrit emails/{id} en file et planifie l’envoi ; le secret ne va qu’à la tâche', async () => {
    const r = await notifier(s, {
      modele: 'lien-connexion',
      destinataire: { uid: 'u1' },
      refObjet: 'connexion/1',
      donnees: { prenom: 'Camille' },
      secrets: lien,
    });
    const doc = (await db.collection(collections.emails).doc(r.email!).get()).data()!;
    expect(doc).toMatchObject({
      modele: 'lien-connexion',
      canal: 'email',
      destinataire: 'camille@test.local',
      statut: 'en_file',
      categorie: 'securite',
      tentatives: 0,
    });
    expect(JSON.stringify(doc)).not.toContain('SECRET-XYZ');
    expect(taches).toEqual([{ envoiId: r.email, envoyerLe: new Date(LUNDI_14H), secrets: lien }]);
  });

  it('idempotence : deux appels identiques, un seul envoi', async () => {
    const e = {
      modele: 'invitation-membre' as const,
      destinataire: { email: 'lea@test.local' },
      refObjet: 'invitations/i1',
      donnees: {},
    };
    const r1 = await notifier(s, e);
    const r2 = await notifier(s, e);
    expect(r1.email).toBeDefined();
    expect(r2).toEqual({ ignores: { email: 'deja_envoye' } });
    expect(taches).toHaveLength(1);
    expect((await db.collection(collections.emails).get()).size).toBe(1);
  });

  it('préférences respectées ; sécurité impossible à bloquer', async () => {
    await db.doc(chemins.user('u1')).update({ 'preferences.notifs.relance.email': false });
    const relance = await notifier(s, {
      modele: 'reprise-simulateur',
      destinataire: { uid: 'u1' },
      refObjet: 'brouillons/b1',
      donnees: {},
    });
    expect(relance.ignores.email).toBe('bloque_preferences');
    await db.doc(chemins.user('u1')).update({
      'preferences.notifs.activite.email': false,
      'preferences.notifs.marketing.email': false,
    });
    const securite = await notifier(s, {
      modele: 'mot-de-passe-oublie',
      destinataire: { uid: 'u1' },
      refObjet: 'mdp/1',
      donnees: {},
    });
    expect(securite.email).toBeDefined();
  });

  it('liste de blocage : un email de sécurité passe une seule fois, rien d’autre', async () => {
    await db
      .collection(collections.suppressions)
      .doc(empreinteEmail('camille@test.local'))
      .set({ schemaVersion: 1, motif: 'rebond', createdAt: new Date() });
    expect(
      (
        await notifier(s, {
          modele: 'bienvenue-particulier',
          destinataire: { uid: 'u1' },
          refObjet: 'x',
          donnees: {},
        })
      ).ignores.email,
    ).toBe('bloque_suppression');
    expect(
      (
        await notifier(s, {
          modele: 'lien-connexion',
          destinataire: { uid: 'u1' },
          refObjet: 'c1',
          donnees: {},
        })
      ).email,
    ).toBeDefined();
    expect(
      (
        await notifier(s, {
          modele: 'lien-connexion',
          destinataire: { uid: 'u1' },
          refObjet: 'c2',
          donnees: {},
        })
      ).ignores.email,
    ).toBe('bloque_suppression');
  });

  it('SMS de code : téléphone vérifié, envoi immédiat même la nuit', async () => {
    const nuit = Date.UTC(2026, 8, 28, 22, 30);
    const r = await notifier(
      { ...s, horloge: () => nuit },
      {
        modele: 'verifier-telephone',
        destinataire: { uid: 'u1' },
        refObjet: 'tel/1',
        donnees: { code: '123456' },
      },
    );
    expect(r.sms).toBeDefined();
    expect((await db.collection(collections.emails).doc(r.sms!).get()).data()).toMatchObject({
      canal: 'sms',
      destinataire: '+33612345678',
    });
    expect(taches.find((t) => t.envoiId === r.sms)!.envoyerLe.getTime()).toBe(nuit);
  });

  it('in-app : notification créée une seule fois', async () => {
    const e = {
      modele: 'invitation-acceptee' as const,
      destinataire: { uid: 'u1' },
      refObjet: 'invitations/i1',
      donnees: { resumeInApp: 'Léa a rejoint votre équipe' },
      titreInApp: 'Nouveau membre',
    };
    const r = await notifier(s, e);
    await notifier(s, e);
    const notifs = await db.collection(chemins.notifications('u1')).get();
    expect(notifs.size).toBe(1);
    expect(notifs.docs[0]!.data()).toMatchObject({
      titre: 'Nouveau membre',
      corps: 'Léa a rejoint votre équipe',
      lu: false,
    });
    expect(r.inapp).toBe(notifs.docs[0]!.id);
  });

  it('limite de pression : deuxième relance du jour reportée au lendemain 9 h', async () => {
    await notifier(s, {
      modele: 'reprise-simulateur',
      destinataire: { uid: 'u1' },
      refObjet: 'b1',
      donnees: {},
    });
    await notifier(s, {
      modele: 'relance-devis',
      destinataire: { uid: 'u1' },
      refObjet: 'd1',
      donnees: {},
    });
    expect(taches[1]!.envoyerLe.toISOString()).toBe('2026-09-29T07:00:00.000Z');
  });

  it('sans adresse : rien n’est envoyé', async () => {
    expect(
      (
        await notifier(s, {
          modele: 'invitation-membre',
          destinataire: {},
          refObjet: 'x',
          donnees: {},
        })
      ).ignores.email,
    ).toBe('sans_adresse');
  });
});

describe('suivi des envois', () => {
  const creer = () =>
    notifier(s, {
      modele: 'invitation-membre',
      destinataire: { email: 'lea@test.local' },
      refObjet: 'inv',
      donnees: {},
    });

  it('envoyé, puis événements du fournisseur ; rebond → liste de blocage', async () => {
    const { email: id } = await creer();
    expect((await lireEnvoi(s, id!))!.destinataire).toBe('lea@test.local');
    await marquerEnvoye(s, id!, 're_123');
    expect(await lireEnvoi(s, id!)).toBeNull();
    expect(await appliquerEvenement(s, 're_123', 'delivre', empreinteEmail)).toBe(true);
    expect(await appliquerEvenement(s, 're_inconnu', 'delivre', empreinteEmail)).toBe(false);
    await appliquerEvenement(s, 're_123', 'rebond', empreinteEmail);
    expect(
      (
        await db.collection(collections.suppressions).doc(empreinteEmail('lea@test.local')).get()
      ).get('motif'),
    ).toBe('rebond');
  });

  it('plainte : liste de blocage et marketing coupé', async () => {
    const { email: id } = await notifier(s, {
      modele: 'bienvenue-particulier',
      destinataire: { uid: 'u1' },
      refObjet: 'b',
      donnees: {},
    });
    await marquerEnvoye(s, id!, 're_9');
    await appliquerEvenement(s, 're_9', 'plainte', empreinteEmail);
    expect((await db.doc(chemins.user('u1')).get()).get('preferences.notifs.marketing.email')).toBe(
      false,
    );
  });

  it('5 échecs : abandon, statut echec et tâche de modération', async () => {
    const { email: id } = await creer();
    const reessayer = [];
    for (let i = 0; i < 5; i++) reessayer.push(await noterEchec(s, id!, 'Resend 500'));
    expect(reessayer).toEqual([true, true, true, true, false]);
    expect((await db.collection(collections.emails).doc(id!).get()).get('statut')).toBe('echec');
    expect((await db.collection(collections.filesModeration).get()).docs[0]!.get('type')).toBe(
      'envoi_echec',
    );
  });

  it('relance annulée : plus jamais envoyée', async () => {
    const { email: id } = await creer();
    await annulerEnvoi(s, id!);
    expect(await lireEnvoi(s, id!)).toBeNull();
  });
});

describe('désabonnement en un clic et jetons signés', () => {
  const secret = 'x'.repeat(32);
  it('jeton : signature, expiration, falsification', () => {
    const j = signerJeton(
      { sujet: 'u:u1', categorie: 'relance', expireLe: LUNDI_14H + 1000 },
      secret,
    );
    expect(verifierJeton(j, secret, LUNDI_14H)).toEqual({
      sujet: 'u:u1',
      categorie: 'relance',
      expireLe: LUNDI_14H + 1000,
    });
    expect(verifierJeton(j, secret, LUNDI_14H + 2000)).toBeNull();
    expect(verifierJeton(j, 'y'.repeat(32), LUNDI_14H)).toBeNull();
    expect(verifierJeton(`${j}x`, secret, LUNDI_14H)).toBeNull();
    expect(verifierJeton('nimporte', secret, LUNDI_14H)).toBeNull();
    expect(() => signerJeton({ sujet: 'u:u1', expireLe: 1 }, 'court')).toThrow();
    expect(j).not.toContain('camille');
  });
  it('coupe seulement la catégorie du lien', async () => {
    await desabonner(s, { sujet: 'u:u1', categorie: 'relance', expireLe: LUNDI_14H + 1 });
    const p = (await db.doc(chemins.user('u1')).get()).get('preferences.notifs');
    expect(p.relance.email).toBe(false);
    expect(p.activite.email).toBe(true);
  });
  it('catégorie obligatoire : sans effet ; sans compte : liste de blocage', async () => {
    await desabonner(s, { sujet: 'u:u1', categorie: 'securite', expireLe: LUNDI_14H + 1 });
    await desabonner(s, {
      sujet: `e:${empreinteEmail('prospect@test.local')}`,
      categorie: 'offres_pro',
      expireLe: LUNDI_14H + 1,
    });
    expect(
      (
        await db
          .collection(collections.suppressions)
          .doc(empreinteEmail('prospect@test.local'))
          .get()
      ).get('motif'),
    ).toBe('demande');
    expect(
      (await db.doc(chemins.user('u1')).get()).get('preferences.notifs.securite'),
    ).toBeUndefined();
  });
  it('les envois ont un TTL de 13 mois', async () => {
    const { email: id } = await notifier(s, {
      modele: 'invitation-membre',
      destinataire: { email: 'lea@test.local' },
      refObjet: 'inv',
      donnees: {},
    });
    const d = (await db.collection(collections.emails).doc(id!).get()).data()!;
    expect((d.expireLe as Timestamp).toMillis() - LUNDI_14H).toBe(395 * 86_400_000);
  });
});
