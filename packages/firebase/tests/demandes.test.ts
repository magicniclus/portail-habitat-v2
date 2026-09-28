import { LIMITE_DEMANDES } from '@ph/core/demandes';
import { creerEnveloppe, type ContexteBase } from '@ph/core/enveloppe';
import { ErreurMetier } from '@ph/core/erreurs';
import { valeursParDefaut } from '@ph/core/parcours';
import { entreeDemande } from '@ph/core/schemas';
import { champsDuTarif, estimer } from '@ph/core/simulateur';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { GeoPoint, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { versFirestore } from '../src/conversion';
import { dependancesEnveloppe } from '../src/serveur';
import type { Notification } from '../src/serveur/comptes';
import { creerDemande, geocodeurApiGeo, type ServicesDemandes } from '../src/serveur/demandes';
import { lireFichiersSeed } from '../src/seed/fichiers';
import { documentsReferentiel, referentielPrix } from '../src/seed/referentiel';

const fichiers = lireFichiersSeed(new URL('../../../docs/data/', import.meta.url));
const T = Date.UTC(2026, 8, 28, 10);

let db: Firestore;
let auth: Auth;
let envois: Notification[];
let s: ServicesDemandes;

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
  const lot = db.batch();
  for (const [chemin, d] of documentsReferentiel(fichiers, new Date(T)))
    if (chemin.startsWith('referentiel/prestations/'))
      lot.set(
        db.doc(chemin),
        versFirestore(d, (a, b) => new GeoPoint(a, b)) as Record<string, unknown>,
      );
  await lot.commit();
  envois = [];
  s = {
    db,
    auth,
    horloge: () => T,
    notifier: async (n) => void envois.push(n),
    urlSite: 'https://portail-habitat.test',
    versionLegale: '2026-09-22',
    geocoder: async (cp) =>
      cp === '33000' ? { ville: 'Bordeaux', geo: { latitude: 44.84, longitude: -0.58 } } : null,
  };
});

const sdb = fichiers.prestations.prestations.find((p) => p.id === 'sdb')!;
const entree = (autres: Record<string, unknown> = {}) =>
  entreeDemande.parse({
    cleIdempotence: 'cle-demande-0001',
    source: 'simulateur',
    prestationId: 'sdb',
    intention: 'sdb-italienne',
    reponses: valeursParDefaut(sdb.champs),
    codePostal: '33000',
    acces: 'etage',
    contact: {
      prenom: 'Camille',
      nom: 'Martin',
      email: 'camille@test.local',
      telephone: '06 12 34 56 78',
    },
    miseEnRelation: true,
    accepteConfidentialite: true,
    ...autres,
  });

describe('creerDemande', () => {
  it('SIM-07 : demande PH-XXXXXX créée, conforme au schéma, consentements et email', async () => {
    const r = await creerDemande(s, entree(), { ipHash: 'ab'.repeat(8), userAgent: 'Vitest' });
    expect(r.reference).toMatch(/^PH-[2-9A-HJ-NP-Z]{6}$/);
    const d = (await db.doc(chemins.demande(r.demandeId)).get()).data()!;
    expect(d).toMatchObject({
      reference: r.reference,
      statut: 'nouvelle',
      source: 'simulateur',
      intention: 'sdb-italienne',
      miseEnRelation: true,
      nbAttributions: 0,
      contact: { email: 'camille@test.local', telephone: '+33612345678' },
      adresseChantier: { codePostal: '33000', ville: 'Bordeaux' },
      ipHash: 'ab'.repeat(8),
    });
    expect(d.adresseChantier.geo).toBeInstanceOf(GeoPoint);
    expect(d.reponsesLisibles.length).toBeGreaterThan(0);

    const uid = d.particulierUid as string;
    const compte = await auth.getUser(uid);
    expect(compte.email).toBe('camille@test.local');
    expect(compte.emailVerified).toBe(false);
    expect((await db.doc(chemins.user(uid)).get()).get('origine')).toBe('demande');
    const consentements = (await db.collection(chemins.consentements(uid)).get()).docs.map((c) =>
      c.data(),
    );
    expect(consentements.map((c) => [c.type, c.valeur]).sort()).toEqual([
      ['confidentialite', true],
      ['mise_en_relation', true],
    ]);
    expect(d.consentementId).toBe(
      (
        await db
          .collection(chemins.consentements(uid))
          .where('type', '==', 'mise_en_relation')
          .get()
      ).docs[0]!.id,
    );

    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({
      modele: 'demande-confirmee',
      destinataire: { uid },
      refObjet: `demandes/${r.demandeId}`,
      donnees: { reference: r.reference, prenom: 'Camille' },
    });
    // Nouveau compte : lien magique (secret, jamais écrit en base).
    expect(envois[0]!.secrets!.lien).toContain('mode=signIn');
    expect(JSON.stringify(envois[0]!.donnees)).not.toContain('oobCode');
  });

  it('SIM-08 : estimation recalculée avec les prix privés, identique au référentiel complet', async () => {
    const r = await creerDemande(s, entree());
    const attendu = estimer(
      {
        prestationId: 'sdb',
        reponses: valeursParDefaut(sdb.champs),
        codePostal: '33000',
        acces: 'etage',
      },
      referentielPrix(fichiers),
    );
    expect(r.estimation.minCentimes).toBe(attendu.minCentimes);
    expect(r.estimation.maxCentimes).toBe(attendu.maxCentimes);
    const d = (await db.doc(chemins.demande(r.demandeId)).get()).data()!;
    expect(d.estimation).toMatchObject({
      minCentimes: attendu.minCentimes,
      maxCentimes: attendu.maxCentimes,
      versionReferentiel: attendu.versionReferentiel,
    });
  });

  it('prestation du catalogue générique : même calcul qu’avec le référentiel complet', async () => {
    const p = fichiers.catalogue.prestations[0]!;
    const reponses = valeursParDefaut(champsDuTarif(p.tarif));
    const r = await creerDemande(s, entree({ prestationId: p.id, intention: undefined, reponses }));
    const attendu = estimer(
      { prestationId: p.id, reponses, codePostal: '33000', acces: 'etage' },
      referentielPrix(fichiers),
    );
    expect([r.estimation.minCentimes, r.estimation.maxCentimes]).toEqual([
      attendu.minCentimes,
      attendu.maxCentimes,
    ]);
    expect(r.estimation.tvaPourcent).toBe(attendu.tvaPourcent);
  });

  it('SIM-09 : email déjà inscrit → rattachement au compte existant, aucun lien magique', async () => {
    const existant = await auth.createUser({
      email: 'camille@test.local',
      emailVerified: true,
      password: 'motdepasse-test',
    });
    const r = await creerDemande(s, entree());
    const d = (await db.doc(chemins.demande(r.demandeId)).get()).data()!;
    expect(d.particulierUid).toBe(existant.uid);
    expect((await auth.listUsers()).users).toHaveLength(1);
    expect(envois[0]!.secrets!.lien).toBe(
      `https://portail-habitat.test/connexion?suite=${encodeURIComponent(`/mon-espace/demandes/${r.demandeId}`)}`,
    );
  });

  it('sans mise en relation : consentement enregistré à faux, estimation seule', async () => {
    const r = await creerDemande(s, entree({ miseEnRelation: false }));
    const d = (await db.doc(chemins.demande(r.demandeId)).get()).data()!;
    expect(d.miseEnRelation).toBe(false);
    const c = await db
      .doc(`${chemins.consentements(d.particulierUid as string)}/${d.consentementId as string}`)
      .get();
    expect(c.get('valeur')).toBe(false);
  });

  it('réponse hors bornes, prestation inconnue, code postal inconnu : refus métier, rien d’écrit', async () => {
    await expect(creerDemande(s, entree({ reponses: { surface: 9999 } }))).rejects.toBeInstanceOf(
      ErreurMetier,
    );
    await expect(creerDemande(s, entree({ prestationId: 'inconnue' }))).rejects.toMatchObject({
      code: 'INTROUVABLE',
    });
    await expect(creerDemande(s, entree({ codePostal: '99999' }))).rejects.toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
    expect((await db.collection(collections.demandes).get()).size).toBe(0);
    expect(envois).toHaveLength(0);
  });

  it('référence déjà prise : nouvel essai', async () => {
    const suite = [...Array(6).fill(0), ...Array(6).fill(0), ...Array(6).fill(0.5)];
    let i = 0;
    s.alea = () => suite[i++ % suite.length]!;
    const a = await creerDemande(s, entree());
    i = 0;
    const b = await creerDemande(s, entree());
    expect(a.reference).toBe('PH-222222');
    expect(b.reference).not.toBe('PH-222222');
  });
});

describe('SIM-10 : limite de débit de l’envoi', () => {
  it('6 envois en 1 h depuis la même IP : le 6e est refusé avec un message clair', async () => {
    const envoyer = creerEnveloppe<ContexteBase>(dependancesEnveloppe(() => db))(
      {
        schema: entreeDemande,
        nom: 'creerDemande',
        authentification: 'facultative',
        rateLimit: LIMITE_DEMANDES,
        idempotence: true,
      },
      async (e) => creerDemande(s, e),
    );
    const ctx = { uid: null, identifiantClient: 'ip:0123456789abcdef', appCheckVerifie: true };
    const resultats = [];
    for (let i = 0; i < 6; i++)
      resultats.push(await envoyer({ ...entree(), cleIdempotence: `cle-demande-${i}-xyz` }, ctx));
    expect(resultats.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(resultats[5]).toMatchObject({
      ok: false,
      code: 'TROP_DE_REQUETES',
      message: 'Trop de tentatives. Réessayez dans quelques minutes.',
    });
    expect((await db.collection(collections.demandes).get()).size).toBe(5);
  });
});

describe('geocodeurApiGeo', () => {
  const reponse = (corps: unknown, ok = true) =>
    (async () => ({ ok, json: async () => corps })) as unknown as typeof fetch;
  it('commune la plus peuplée du code postal', async () => {
    const g = geocodeurApiGeo(
      reponse([
        { nom: 'Petite', population: 10, centre: { coordinates: [1, 2] } },
        { nom: 'Grande', population: 900, centre: { coordinates: [-0.58, 44.84] } },
      ]),
    );
    expect(await g('33000')).toEqual({
      ville: 'Grande',
      geo: { latitude: 44.84, longitude: -0.58 },
    });
  });
  it('code inconnu : null ; panne : INDISPONIBLE', async () => {
    expect(await geocodeurApiGeo(reponse([]))('99999')).toBeNull();
    await expect(geocodeurApiGeo(reponse(null, false))('33000')).rejects.toMatchObject({
      code: 'INDISPONIBLE',
    });
  });
});
