import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import {
  enregistrerAppareilPush,
  notifier,
  pousserFcm,
  retirerAppareilPush,
  type EnvoyeurPush,
} from '../src/serveur/notifications';

let db: Firestore;
let envoyes: { tokens: string[]; data: Record<string, string> }[];
let invalides: Set<string>;

const envoyeur: EnvoyeurPush = {
  async sendEachForMulticast(m) {
    envoyes.push({ tokens: m.tokens, data: m.data ?? {} });
    return {
      responses: m.tokens.map((t) =>
        invalides.has(t)
          ? { success: false, error: { code: 'messaging/registration-token-not-registered' } }
          : { success: true },
      ),
    };
  },
};

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  envoyes = [];
  invalides = new Set();
});

describe('notifications push (MOB-06)', () => {
  it('enregistre un appareil une seule fois (jeton haché en identifiant) et le retire', async () => {
    await enregistrerAppareilPush(db, 'u1', 'jeton-A', 'Chrome sur Android', 1000);
    await enregistrerAppareilPush(db, 'u1', 'jeton-A', 'Chrome sur Android', 2000);
    const docs = await db.collection(chemins.appareilsPush('u1')).get();
    expect(docs.size).toBe(1);
    expect(docs.docs[0]!.id).not.toContain('jeton-A');
    await retirerAppareilPush(db, 'u1', 'jeton-A');
    expect((await db.collection(chemins.appareilsPush('u1')).get()).size).toBe(0);
  });

  it('envoie à tous les appareils et oublie les jetons périmés', async () => {
    await enregistrerAppareilPush(db, 'u1', 'jeton-A', 'Chrome sur Android', 1000);
    await enregistrerAppareilPush(db, 'u1', 'jeton-B', 'Safari sur iPhone', 1000);
    invalides.add('jeton-B');
    await pousserFcm(db, envoyeur)('u1', {
      titre: 'Nouvelle demande',
      corps: 'Peinture',
      lien: '/pro/demandes',
    });
    expect(envoyes[0]!.tokens.sort()).toEqual(['jeton-A', 'jeton-B']);
    expect(envoyes[0]!.data).toEqual({
      titre: 'Nouvelle demande',
      corps: 'Peinture',
      lien: '/pro/demandes',
    });
    const restants = await db.collection(chemins.appareilsPush('u1')).get();
    expect(restants.docs.map((d) => d.get('jeton'))).toEqual(['jeton-A']);
  });

  it('sans appareil : aucun envoi', async () => {
    await pousserFcm(db, envoyeur)('u2', { titre: 'x', corps: '', lien: '/pro' });
    expect(envoyes).toEqual([]);
  });

  it('notifier() pousse la notification in-app vers les appareils du destinataire', async () => {
    await db.doc(chemins.user('u1')).set({ email: 'paul@test.local' });
    await enregistrerAppareilPush(db, 'u1', 'jeton-A', 'Chrome sur Android', 1000);
    await notifier(
      {
        db,
        horloge: Date.now,
        planifier: async () => undefined,
        pousser: pousserFcm(db, envoyeur),
      },
      {
        modele: 'nouvel-avis',
        destinataire: { uid: 'u1' },
        refObjet: 'avis/a1',
        donnees: { resumeInApp: 'Travail soigné', lienInApp: '/pro/avis' },
        titreInApp: 'Nouvel avis',
      },
    );
    expect(envoyes).toEqual([
      {
        tokens: ['jeton-A'],
        data: { titre: 'Nouvel avis', corps: 'Travail soigné', lien: '/pro/avis' },
      },
    ]);
  });
});
