import { createHash } from 'node:crypto';
import { GeoPoint, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { collections } from '../src/chemins';
import { versFirestore } from '../src/conversion';
import type { Envoi } from '../src/serveur/notifications/notifier';
import {
  confirmerTelephonePartenaire,
  enregistrerSource,
  importerDemandePartenaire,
  type ServicesImport,
} from '../src/serveur/partenaires';
import { lireFichiersSeed } from '../src/seed/fichiers';
import { documentsReferentiel } from '../src/seed/referentiel';

const fichiers = lireFichiersSeed(new URL('../../../docs/data/', import.meta.url));
const T = Date.UTC(2026, 9, 2, 10);
const TEXTE =
  'J’accepte que mes coordonnées soient transmises à Portail Habitat et à des professionnels partenaires afin d’être recontacté pour mon projet.';
const IP = '203.0.113.7';
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

let db: Firestore;
let envois: Envoi[];
let s: ServicesImport;

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  const lot = db.batch();
  for (const [chemin, d] of documentsReferentiel(fichiers, new Date(T)))
    if (chemin.startsWith('referentiel/prestations/'))
      lot.set(
        db.doc(chemin),
        versFirestore(d, (a, b) => new GeoPoint(a, b)) as Record<string, unknown>,
      );
  lot.set(db.collection(collections.sourcesDemandes).doc('simulateur-aides'), {
    schemaVersion: 1,
    nom: 'Simulateur aides',
    actif: true,
    cleApiHash: sha('cle-secrete'),
    ipAutorisees: [IP],
    coutUnitaireCentimes: 700,
    mappingPrestations: { isolation_combles: 'isolation' },
    texteConsentementAttendu: TEXTE,
    versionConsentement: 'v3-2026-06',
    quotaJour: 5,
    departementsCouverts: ['33'],
  });
  await lot.commit();
  envois = [];
  let n = 0;
  s = {
    db,
    horloge: () => T,
    notifier: async (e) => void envois.push(e),
    urlSite: 'https://portail-habitat.test',
    smsConfirmation: true,
    jeton: () => `jeton-de-confirmation-${++n}-abcdefghij`,
    geocoder: async (cp) =>
      cp === '33600' ? { ville: 'Pessac', geo: { latitude: 44.8, longitude: -0.63 } } : null,
  };
});

const corps = (p: { id?: string; tel?: string; verifie?: boolean; extra?: object } = {}) => ({
  idExterne: p.id ?? 'SIM-1',
  recueLe: '2026-10-02T11:42:11+02:00',
  contact: {
    prenom: 'Claire',
    nom: 'Martin',
    email: 'claire.martin@email.fr',
    telephone: p.tel ?? '+33631420045',
    telephoneVerifie: p.verifie ?? true,
  },
  chantier: {
    codePostal: '33600',
    ville: 'Pessac',
    typeTravaux: 'isolation_combles',
    description: 'Combles perdus d’environ 80 m².',
    surfaceM2: 80,
  },
  qualification: { statutOccupation: 'proprietaire_occupant', horizon: 'moins_3_mois' },
  aides: {
    eligibilite: 'eligible',
    trancheRevenus: 'jaune',
    montantEstimeCentimes: 180_000,
    dispositifs: ['MaPrimeRenov', 'CEE'],
  },
  consentement: {
    coche: true,
    texteAffiche: TEXTE,
    versionTexte: 'v3-2026-06',
    horodatage: '2026-10-02T11:41:58+02:00',
    urlPage: 'https://simulateur-aides.fr/resultat',
    ip: '92.184.12.40',
    userAgent: 'Mozilla/5.0',
    finalites: ['transmission_portail_habitat', 'mise_en_relation_professionnels'],
  },
  ...p.extra,
});
const envoyer = (c: unknown, req: { cle?: string; ip?: string } = {}) =>
  importerDemandePartenaire(s, {
    sourceId: 'simulateur-aides',
    cleApi: req.cle ?? 'cle-secrete',
    ip: req.ip ?? IP,
    corps: c,
  });
const nbDemandes = async () => (await db.collection(collections.demandes).get()).size;

describe('importerDemandePartenaire (IMPORT_LEADS)', () => {
  it('crée la demande partenaire : niveau A, RGE requis, aides indicatives, preuve hachée', async () => {
    const r = await envoyer(corps());
    expect(r).toMatchObject({
      http: 201,
      corps: { statut: 'creee', idExterne: 'SIM-1', niveau: 'A' },
    });
    const [d] = (await db.collection(collections.demandes).get()).docs;
    expect(d!.data()).toMatchObject({
      reference: r.corps.reference,
      source: 'partenaire',
      partenaire: { sourceId: 'simulateur-aides', idExterne: 'SIM-1', coutAchatCentimes: 700 },
      qualification: { niveau: 'A', telephoneVerifie: true },
      rgeRequis: true,
      aides: { montantEstimeCentimes: 180_000, mention: 'indicatif' },
      particulierUid: null,
      statut: 'nouvelle',
      delaiSouhaite: '3mois',
    });
    expect(d!.get('estimation.minCentimes')).toBeGreaterThan(0);
    const preuve = await db
      .collection(collections.preuvesConsentement)
      .doc(d!.get('consentementId'))
      .get();
    expect(preuve.data()).toMatchObject({
      coche: true,
      versionTexte: 'v3-2026-06',
      ipHash: sha('92.184.12.40'),
    });
    expect(JSON.stringify(preuve.data())).not.toContain('92.184.12.40');
    expect(envois).toHaveLength(0);
  });

  it('IMP-01 : même idExterne renvoyé (y compris en même temps) → une seule demande', async () => {
    const [a, b] = await Promise.all([envoyer(corps()), envoyer(corps())]);
    const c = await envoyer(corps());
    expect([a.http, b.http].sort()).toEqual([200, 201]);
    expect(c).toMatchObject({
      http: 200,
      corps: { statut: 'deja_recue', reference: a.corps.reference ?? b.corps.reference },
    });
    expect(await nbDemandes()).toBe(1);
  });

  it('IMP-02 : consentement non conforme → rejet visible dans le journal, aucune donnée personnelle', async () => {
    const r = await envoyer(
      corps({ extra: { consentement: { ...corps().consentement, versionTexte: 'v2' } } }),
    );
    expect(r).toMatchObject({
      http: 422,
      corps: { statut: 'rejetee', motifRejet: 'consentement_absent' },
    });
    const journal = (await db.collection(collections.importsDemandes).get()).docs.map((d) =>
      d.data(),
    );
    expect(journal).toEqual([
      expect.objectContaining({ statut: 'rejetee', motifRejet: 'consentement_absent' }),
    ]);
    expect(JSON.stringify(journal)).not.toMatch(/claire|31420045|Martin/i);
    expect(await nbDemandes()).toBe(0);
    expect((await db.collection(collections.preuvesConsentement).get()).size).toBe(0);
    // Corrigé puis renvoyé avec le même identifiant : accepté.
    expect((await envoyer(corps())).http).toBe(201);
  });

  it('rejets : schéma, type de travaux, téléphone, zone ; clé, IP et quota', async () => {
    expect((await envoyer({ ...corps({ id: 'X1' }), inconnu: 1 })).corps.motifRejet).toBe(
      'schema_invalide',
    );
    expect(
      (
        await envoyer(
          corps({ id: 'X2', extra: { chantier: { ...corps().chantier, typeTravaux: 'piscine' } } }),
        )
      ).corps,
    ).toMatchObject({ motifRejet: 'schema_invalide', details: 'chantier.typeTravaux inconnu' });
    expect((await envoyer(corps({ id: 'X3', tel: '+447700900123' }))).corps.motifRejet).toBe(
      'telephone_invalide',
    );
    expect(
      (
        await envoyer(
          corps({ id: 'X4', extra: { chantier: { ...corps().chantier, codePostal: '75001' } } }),
        )
      ).corps.motifRejet,
    ).toBe('hors_zone_couverte');
    expect((await envoyer(corps({ id: 'X5' }), { cle: 'mauvaise' })).http).toBe(401);
    expect((await envoyer(corps({ id: 'X6' }), { ip: '198.51.100.1' })).http).toBe(403);
    expect((await envoyer(corps({ id: 'X7', tel: '+33600000007' }))).http).toBe(201);
    expect((await envoyer(corps({ id: 'X8', tel: '+33600000008' }))).http).toBe(429);
  });

  it('doublon : même téléphone et même prestation sous 30 jours', async () => {
    await envoyer(corps());
    expect(await envoyer(corps({ id: 'SIM-2' }))).toMatchObject({
      http: 200,
      corps: { statut: 'doublon' },
    });
    expect(await nbDemandes()).toBe(1);
  });

  it('téléphone non vérifié : niveau B, SMS avec lien ; le lien confirme et relève le niveau une seule fois', async () => {
    const r = await envoyer(corps({ verifie: false }));
    expect(r.corps.niveau).toBe('B');
    expect(envois).toEqual([
      expect.objectContaining({
        modele: 'confirmer-telephone',
        destinataire: { telephone: '+33631420045' },
        secrets: {
          lien: 'https://portail-habitat.test/confirmer-telephone?jeton=jeton-de-confirmation-1-abcdefghij',
        },
      }),
    ]);
    expect(await confirmerTelephonePartenaire(s, 'jeton-de-confirmation-1-abcdefghij')).toBe(
      'confirme',
    );
    const [d] = (await db.collection(collections.demandes).get()).docs;
    expect(d!.get('qualification')).toMatchObject({ niveau: 'A', telephoneVerifie: true });
    expect(d!.get('partenaire.jetonTelephoneHash')).toBeUndefined();
    expect(await confirmerTelephonePartenaire(s, 'jeton-de-confirmation-1-abcdefghij')).toBe(
      'invalide',
    );
  });
});

describe('enregistrerSource', () => {
  it('clé générée une fois (empreinte seule), mapping vérifié contre le référentiel', async () => {
    const p = {
      id: 'autre-site',
      nom: 'Autre site',
      ipAutorisees: [IP],
      coutUnitaireCentimes: 700,
      quotaJour: 100,
      departementsCouverts: ['33'],
      versionConsentement: 'v1',
      texteConsentementAttendu: TEXTE,
      mappingPrestations: { combles: 'isolation' },
    };
    const { cleApi } = await enregistrerSource(s, p);
    expect(cleApi).toMatch(/^[\w-]{40,}$/);
    const doc = await db.collection(collections.sourcesDemandes).doc('autre-site').get();
    expect(doc.get('cleApiHash')).toBe(sha(cleApi!));
    expect(JSON.stringify(doc.data())).not.toContain(cleApi!);
    expect((await enregistrerSource(s, { ...p, quotaJour: 50 })).cleApi).toBeNull();
    expect(doc.get('cleApiHash')).toBe((await doc.ref.get()).get('cleApiHash'));
    await expect(
      enregistrerSource(s, { ...p, mappingPrestations: { x: 'inexistante' } }),
    ).rejects.toThrow('Prestations inconnues : inexistante');
  });
});
