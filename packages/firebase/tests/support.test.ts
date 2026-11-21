import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import { creerContact, journaliserRecherche } from '../src/serveur/support';

let db: Firestore;
beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

const entree = {
  sujet: 'demande' as const,
  nom: 'Camille Martin',
  email: 'camille@test.local',
  referenceDossier: 'D-2026-0042',
  message: 'Aucun artisan ne m’a rappelée depuis lundi.',
};

describe('creerContact', () => {
  it('document contacts/{référence} ouvert, validé par le schéma', async () => {
    const { reference } = await creerContact({ db, horloge: () => Date.UTC(2026, 8, 28) }, entree, {
      role: 'particulier',
    });
    expect(reference).toMatch(/^CT-[2-9A-Z]{6}$/);
    const d = (await db.collection(collections.contacts).doc(reference).get()).data()!;
    expect(d).toMatchObject({
      statut: 'ouvert',
      sujet: 'demande',
      referenceDossier: 'D-2026-0042',
      role: 'particulier',
    });
  });
  it('collision de référence : nouvel essai', async () => {
    const suite = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    const s = { db, horloge: Date.now, alea: () => suite[i++ % suite.length]! };
    const a = await creerContact(s, entree, { role: 'autre' });
    i = 0;
    const b = await creerContact(s, entree, { role: 'autre' });
    expect(a.reference).toBe('CT-222222');
    expect(b.reference).not.toBe(a.reference);
  });
});

describe('journaliserRecherche', () => {
  it('événement « recherche » avec TTL de 13 mois, sans donnée personnelle', async () => {
    const t = Date.UTC(2026, 8, 28);
    await journaliserRecherche(
      { db, horloge: () => t },
      {
        nature: 'choix',
        q: 'douche italienne',
        intention: 'sdb-italienne',
        rang: 1,
        session: 'ab12cd34',
      },
    );
    const docs = (await db.collection(collections.evenements).get()).docs.map((d) => d.data());
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      type: 'recherche',
      sessionId: 'ab12cd34',
      meta: { nature: 'choix', q: 'douche italienne', intention: 'sdb-italienne', rang: 1 },
    });
    expect(docs[0]!.expireLe.toMillis() - t).toBe(395 * 86_400_000);
  });
});
