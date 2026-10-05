import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { enregistrerProspect, planifierProspects, traiterReponseEmail } from '../src/serveur/cycle';
import { empreinteEmail } from '../src/serveur/notifications';

/** Prospects (CONVERSION §3 S1) : estimation reçue par email depuis la page d'acquisition. */
let db: Firestore;
const T = Date.UTC(2026, 9, 6, 8);
const J = 86_400_000;
const bordeaux = { latitude: 44.84, longitude: -0.58 };
const envois: {
  modele: string;
  destinataire: { email?: string };
  donnees: Record<string, unknown>;
}[] = [];
const s = {
  get db() {
    return db;
  },
  horloge: () => T,
  notifier: async (e: unknown) => void envois.push(e as (typeof envois)[number]),
  geocodeur: async (cp: string) => (cp === '33000' ? { ville: 'Bordeaux', geo: bordeaux } : null),
  estimerDemandes: () => 27,
  nomMetier: (id: string) => (id === 'electricien' ? 'Électricien' : undefined),
  urlSite: 'https://ph.test',
};
const e = { email: 'marc@exemple.fr', metier: 'electricien', codePostal: '33000' };

beforeAll(() => {
  db = getFirestore(appAdmin());
});
beforeEach(async () => {
  envois.length = 0;
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
});

describe('enregistrerProspect', () => {
  it('prospect créé avec la preuve du consentement, estimation envoyée avec les vrais chiffres', async () => {
    await db.doc(chemins.artisan('x')).set({
      metiers: ['electricien'],
      enLigne: true,
      zoneIntervention: { centre: { latitude: 44.85, longitude: -0.57 } },
    });
    await db.doc(chemins.demande('d1')).set({
      metierRequis: 'electricien',
      adresseChantier: { codePostal: '33400' },
      estimation: { minCentimes: 200_000, maxCentimes: 400_000 },
      createdAt: Timestamp.fromMillis(T - 10 * J),
    });
    await enregistrerProspect(s, e);
    const p = (
      await db.collection(collections.prospects).doc(empreinteEmail(e.email)).get()
    ).data()!;
    expect(p).toMatchObject({
      email: e.email,
      source: 'estimation',
      metiers: ['electricien'],
      commune: 'Bordeaux',
      etape: 'prospect',
      consentement: { base: 'interet_legitime_b2b' },
      desabonne: false,
    });
    expect(envois).toEqual([
      expect.objectContaining({
        modele: 'prospect-estimation',
        destinataire: { email: e.email },
        donnees: expect.objectContaining({
          metier: 'électricien',
          ville: 'Bordeaux',
          demandes30j: 27,
          inscritsZone: 1,
          budgetMoyenCentimes: 300_000,
          lien: 'https://ph.test/pro?metier=electricien#inscription',
        }),
      }),
    ]);
  });

  it('une seule fois par adresse ; rien pour une adresse qui a déjà un compte', async () => {
    await enregistrerProspect(s, e);
    await enregistrerProspect(s, e);
    expect(envois).toHaveLength(1);
    expect(envois[0]!.donnees.budgetMoyenCentimes).toBeUndefined();
    await db.doc(chemins.user('u1')).set({ email: 'deja@exemple.fr' });
    await enregistrerProspect(s, { ...e, email: 'deja@exemple.fr' });
    expect(envois).toHaveLength(1);
    expect(
      (await db.collection(collections.prospects).doc(empreinteEmail('deja@exemple.fr')).get())
        .exists,
    ).toBe(false);
  });

  it('code postal ou métier inconnus : refusés', async () => {
    await expect(enregistrerProspect(s, { ...e, codePostal: '99999' })).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
    await expect(enregistrerProspect(s, { ...e, metier: 'astronaute' })).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
  });
});

describe('planifierProspects (séquence S1)', () => {
  const prospect = (id: string, creeLe: number, p: Record<string, unknown> = {}) =>
    db
      .collection(collections.prospects)
      .doc(id)
      .set({
        email: `${id}@exemple.fr`,
        metiers: ['electricien'],
        commune: 'Bordeaux',
        geo: bordeaux,
        etape: 'prospect',
        desabonne: false,
        createdAt: Timestamp.fromMillis(creeLe),
        ...p,
      });
  const demande = (id: string, le: number, geo = { latitude: 44.8, longitude: -0.6 }) =>
    db.doc(chemins.demande(id)).set({
      metierRequis: 'electricien',
      prestationId: 'tableau',
      delaiSouhaite: 'asap',
      adresseChantier: { ville: 'Talence', geo, codePostal: '33400' },
      estimation: { minCentimes: 240_000, maxCentimes: 320_000 },
      createdAt: Timestamp.fromMillis(le),
    });

  it('demande réelle à moins de 15 km arrivée la veille, puis rien pendant 7 jours', async () => {
    await db.doc(chemins.prestationItem('tableau')).set({ nom: 'Tableau électrique' });
    await prospect('p1', T - 3 * J);
    await demande('d1', T - 3_600_000);
    expect(await planifierProspects(s)).toEqual({ examines: 1, envoyes: 1 });
    expect(envois[0]).toMatchObject({
      modele: 'prospect-demande-zone',
      destinataire: { email: 'p1@exemple.fr' },
      donnees: {
        travaux: 'Tableau électrique',
        ville: 'Talence',
        distanceKm: 5,
        delai: 'Dès que possible',
        budgetMinCentimes: 240_000,
      },
    });
    await planifierProspects({ ...s, horloge: () => T + J });
    expect(envois).toHaveLength(1);
  });

  it('J+12 : « dernière » signée ; désinscrit ou inscrit : rien', async () => {
    await prospect('p2', T - 12 * J);
    await prospect('p3', T - 12 * J, { desabonne: true });
    await prospect('p4', T - 12 * J, { etape: 'inscription_commencee' });
    await planifierProspects(s);
    expect(envois.map((e) => [e.modele, e.destinataire.email, e.donnees.signataire])).toEqual([
      ['prospect-derniere', 'p2@exemple.fr', 'Julie'],
    ]);
    await planifierProspects({ ...s, horloge: () => T + J });
    expect(envois).toHaveLength(1);
  });
});

describe('réponses aux emails (Resend Inbound)', () => {
  it('artisan : tâche « réponse commerciale » et séquence en pause ; une seule tâche ouverte', async () => {
    await db.doc(chemins.user('u1')).set({ email: 'marc@exemple.fr' });
    await db.doc(chemins.artisan('a1')).set({ proprietaireUid: 'u1' });
    expect(await traiterReponseEmail(s, 'Marc <Marc@Exemple.fr>')).toBe('artisan');
    expect(await traiterReponseEmail(s, 'marc@exemple.fr')).toBe('artisan');
    const taches = await db.collection(collections.filesModeration).get();
    expect(taches.docs.map((d) => [d.get('type'), d.get('refs')])).toEqual([
      ['reponse_commerciale', { artisanId: 'a1' }],
    ]);
    expect((await db.collection(collections.cycleEtat).doc('a1').get()).get('pause.par')).toBe(
      `tache:${taches.docs[0]!.id}`,
    );
  });

  it('prospect : séquence S1 en pause tant que la tâche est ouverte ; inconnu : rien', async () => {
    await enregistrerProspect(s, e);
    envois.length = 0;
    expect(await traiterReponseEmail(s, e.email)).toBe('prospect');
    expect(await traiterReponseEmail(s, 'inconnu@exemple.fr')).toBeNull();
    const ref = db.collection(collections.prospects).doc(empreinteEmail(e.email));
    await ref.update({ createdAt: Timestamp.fromMillis(T - 12 * J) });
    await planifierProspects(s);
    expect(envois).toEqual([]);
    const tache = (await db.collection(collections.filesModeration).get()).docs[0]!;
    await tache.ref.update({ statut: 'traitee' });
    await planifierProspects(s);
    expect(envois.map((x) => x.modele)).toEqual(['prospect-derniere']);
    expect((await ref.get()).get('pause')).toBeUndefined();
  });
});
