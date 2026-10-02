import { encoderGeohash } from '@ph/core/geo';
import { createHash } from 'node:crypto';
import { GeoPoint, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins, collections } from '../src/chemins';
import { versFirestore } from '../src/conversion';
import {
  attribuerDemande,
  relancerMatching,
  viderCacheReferentiel,
  type ServicesMatching,
} from '../src/serveur/matching';
import { importerDemandePartenaire, type ServicesImport } from '../src/serveur/partenaires';
import { marquerDemandesVues } from '../src/serveur/pro';
import { lireFichiersSeed } from '../src/seed/fichiers';
import { documentsReferentiel } from '../src/seed/referentiel';

const fichiers = lireFichiersSeed(new URL('../../../docs/data/', import.meta.url));
const T = Date.UTC(2026, 9, 2, 10);
const H = 3_600_000;
const TEXTE =
  'J’accepte que mes coordonnées soient transmises à Portail Habitat et à des partenaires.';
const PESSAC = { latitude: 44.8, longitude: -0.63 };
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

let db: Firestore;
let imp: ServicesImport;
let mat: ServicesMatching;
let horloge = T;

beforeAll(() => {
  db = getFirestore(appAdmin());
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJET_EMULATEUR}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  viderCacheReferentiel();
  horloge = T;
  const lot = db.batch();
  for (const [chemin, d] of documentsReferentiel(fichiers, new Date(T)))
    if (chemin.startsWith('referentiel/prestations/'))
      lot.set(
        db.doc(chemin),
        versFirestore(d, (a, b) => new GeoPoint(a, b)) as Record<string, unknown>,
      );
  lot.set(db.doc(`${chemins.metiersRecherche()}/isolation`), {
    nom: 'Isolation',
    prestationDefaut: 'isolation',
    famille: 'enveloppe',
  });
  lot.set(db.collection(collections.sourcesDemandes).doc('sim'), {
    schemaVersion: 1,
    nom: 'Simulateur',
    actif: true,
    cleApiHash: sha('cle'),
    ipAutorisees: ['1.1.1.1'],
    coutUnitaireCentimes: 700,
    mappingPrestations: { combles: 'isolation' },
    texteConsentementAttendu: TEXTE,
    versionConsentement: 'v1',
    quotaJour: 1000,
    departementsCouverts: [],
  });
  await lot.commit();
  imp = {
    db,
    horloge: () => horloge,
    notifier: async () => undefined,
    urlSite: 'https://ph.test',
    smsConfirmation: false,
    geocoder: async () => ({ ville: 'Pessac', geo: PESSAC }),
  };
  mat = { db, horloge: () => horloge, notifier: async () => undefined };
});

async function artisan(id: string, p: { plan?: string; rge?: string[] | null } = {}) {
  const plan = p.plan ?? 'gratuit';
  await Promise.all([
    db.doc(chemins.artisan(id)).set({
      siren: `55210055${id.length}`,
      nomCommercial: id,
      metierPrincipal: 'isolation',
      metiers: ['isolation'],
      zoneIntervention: { centre: PESSAC, rayonKm: 30 },
      verification: { statut: 'verifie', verifieLe: Timestamp.fromMillis(T - 100 * 86_400_000) },
      labelsVerifies: { decennale: {} },
      ...(p.rge !== null ? { rge: { verifie: true, domaines: p.rge ?? [] } } : {}),
      plan,
      optionVisibilite: plan !== 'gratuit',
      quotaDemandesMois: plan === 'premium' ? 4 : 0,
      demandesRecuesMois: 0,
      noteMoyenne: 4.7,
      nbAvis: 10,
      tauxRecommandation: 0.95,
      tauxReponse: 0.9,
      tempsReponseMoyenMin: 60,
      completude: 90,
      statut: 'actif',
      proprietaireUid: `u-${id}`,
    }),
    db.doc(chemins.artisanPublic(id)).set({
      enLigne: true,
      metiers: ['isolation'],
      geohash: encoderGeohash(PESSAC.latitude, PESSAC.longitude),
    }),
    db.doc(chemins.membre(id, `u-${id}`)).set({ role: 'proprietaire', statut: 'actif' }),
  ]);
}

let n = 0;
async function importer(p: { statut?: string; horizon?: string; eligibilite?: string } = {}) {
  n++;
  const r = await importerDemandePartenaire(imp, {
    sourceId: 'sim',
    cleApi: 'cle',
    ip: '1.1.1.1',
    corps: {
      idExterne: `ID-${n}`,
      recueLe: '2026-10-02T12:00:00+02:00',
      contact: {
        prenom: 'Claire',
        nom: 'Martin',
        email: `c${n}@test.local`,
        telephone: `+3361${String(n).padStart(7, '0')}`,
        telephoneVerifie: true,
      },
      chantier: { codePostal: '33600', ville: 'Pessac', typeTravaux: 'combles', surfaceM2: 80 },
      qualification: {
        statutOccupation: p.statut ?? 'proprietaire_occupant',
        horizon: p.horizon ?? 'moins_3_mois',
      },
      aides: { eligibilite: p.eligibilite ?? 'eligible', montantEstimeCentimes: 150_000 },
      consentement: {
        coche: true,
        texteAffiche: TEXTE,
        versionTexte: 'v1',
        horodatage: '2026-10-02T11:59:00+02:00',
        urlPage: 'https://sim.test/resultat',
        ip: '9.9.9.9',
        userAgent: 'test',
        finalites: ['transmission_portail_habitat', 'mise_en_relation_professionnels'],
      },
    },
  });
  expect(r.http).toBe(201);
  const d = await db
    .collection(collections.demandes)
    .where('reference', '==', r.corps.reference)
    .get();
  return d.docs[0]!.id;
}

describe('matching des demandes partenaires', () => {
  it('IMP-03 : éligible aux aides → seuls les RGE vérifiés dont le domaine couvre la prestation', async () => {
    await artisan('rge', { plan: 'premium' });
    await artisan('sansrge', { plan: 'premium', rge: null });
    await artisan('autredomaine', { plan: 'premium', rge: ['chauffage'] });
    const id = await importer();
    expect(await attribuerDemande(mat, id)).toBe('attribuee');
    const trace = (await db.collection(collections.matching).doc(id).get()).get('candidats') as {
      artisanId: string;
      exclu?: string;
    }[];
    expect(trace.filter((c) => !c.exclu).map((c) => c.artisanId)).toEqual(['rge']);
  });

  it('A : exclusive Premium réattribuée si non vue sous 2 h ; vue, le délai normal revient', async () => {
    await artisan('prem', { plan: 'premium' });
    const id = await importer();
    await attribuerDemande(mat, id);
    const ref = db.doc(chemins.attribution(id, 'prem'));
    expect((await ref.get()).get('expireLe').toMillis()).toBe(T + 2 * H);
    expect((await ref.get()).get('expireLeSiVue').toMillis()).toBe(T + 24 * H);
    expect(await marquerDemandesVues(mat, 'prem')).toBe(1);
    expect((await ref.get()).data()).toMatchObject({ statut: 'vue' });
    expect((await ref.get()).get('expireLe').toMillis()).toBe(T + 24 * H);
  });

  it('IMP-05 : niveau C jamais exclusive ; prix × 0,4 (niveau) × 1,2 (éligible)', async () => {
    await artisan('prem', { plan: 'premium' });
    const id = await importer({ statut: 'locataire' });
    expect(await attribuerDemande(mat, id)).toBe('appel_offres');
    expect((await db.doc(chemins.attribution(id, 'prem')).get()).exists).toBe(false);
    const ao = (await db.doc(chemins.appelOffres(id)).get()).data()!;
    expect(ao.tarification.detailCalcul).toMatchObject({ coefNiveau: 0.4, coefEligibilite: 1.2 });
    expect(ao.exigences).toEqual(['rge']);
  });

  it('invendue à 24 h sans déblocage, archivée à 72 h ; supervision des imports en retard', async () => {
    await artisan('grat');
    const id = await importer({ eligibilite: 'non_eligible' });
    const enAttente = await importer({ eligibilite: 'non_eligible' });
    await attribuerDemande(mat, id);
    horloge = T + 25 * H;
    const b = await relancerMatching(mat);
    expect(b).toMatchObject({ invendues: 1, archivees: 0, enRetard: 1 });
    expect((await db.doc(chemins.demande(id)).get()).get('invendueLe')).toBeDefined();
    horloge = T + 73 * H;
    expect(await relancerMatching(mat)).toMatchObject({ invendues: 0, archivees: 1 });
    expect((await db.doc(chemins.demande(id)).get()).data()).toMatchObject({ statut: 'close' });
    expect((await db.doc(chemins.appelOffres(id)).get()).get('statut')).toBe('clos');
    expect(enAttente).toBeTruthy();
  });

  it(
    'IMP-04 : 200 demandes importées, chacune proposée en moins de 5 minutes',
    { timeout: 300_000 },
    async () => {
      await artisan('prem', { plan: 'premium' });
      await artisan('grat');
      const delais: number[] = [];
      const ids = Array.from({ length: 200 }, (_, i) => i);
      for (let i = 0; i < ids.length; i += 10)
        await Promise.all(
          ids.slice(i, i + 10).map(async () => {
            const debut = Date.now();
            const id = await importer({ eligibilite: 'non_eligible' });
            await attribuerDemande(mat, id);
            delais.push(Date.now() - debut);
          }),
        );
      expect(delais).toHaveLength(200);
      expect(Math.max(...delais)).toBeLessThan(5 * 60_000);
      const nouvelles = await db
        .collection(collections.demandes)
        .where('statut', '==', 'nouvelle')
        .count()
        .get();
      expect(nouvelles.data().count).toBe(0);
      console.info(
        `IMP-04 : médiane ${delais.sort((a, b) => a - b)[100]} ms, max ${delais.at(-1)} ms`,
      );
    },
  );
});
