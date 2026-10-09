import { encoderGeohash } from '@ph/core/geo';
import { lireFiltresAnnuaire } from '@ph/core/annuaire';
import { artisan } from '@ph/core/schemas';
import { GeoPoint, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { versFirestore } from '../src/conversion';
import {
  fichesAutour,
  lireFichePublique,
  publierFiche,
  trierResultats,
} from '../src/serveur/annuaire';

const T = Date.UTC(2026, 8, 28, 10);
const BORDEAUX = { latitude: 44.8378, longitude: -0.5792 };
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

async function creerArtisan(
  id: string,
  o: {
    centre?: { latitude: number; longitude: number };
    rayonKm?: number;
    autres?: Record<string, unknown>;
  } = {},
) {
  const centre = o.centre ?? BORDEAUX;
  const a = artisan.parse({
    schemaVersion: 1,
    createdAt: new Date(T),
    raisonSociale: `${id} SARL`,
    nomCommercial: `Artisan ${id}`,
    slug: `artisan-${id}`,
    siren: '552100554',
    siret: '55210055400013',
    adresseSiege: { ligne1: '1 rue privée', codePostal: '33000', ville: 'Bordeaux' },
    telephonePublic: '+33556000090',
    emailContact: `${id}@prive.test`,
    metiers: ['plombier'],
    metierPrincipal: 'plombier',
    tags: [],
    labels: ['decennale', 'rge'],
    labelsVerifies: { decennale: { verifieLe: new Date(T), docId: 'd' } },
    zoneIntervention: {
      centre,
      geohash: encoderGeohash(centre.latitude, centre.longitude),
      rayonKm: o.rayonKm ?? 30,
      rayonAccepteLe: new Date(T),
    },
    source: 'direct',
    plan: 'gratuit',
    optionVisibilite: false,
    verification: { statut: 'verifie' },
    quotaDemandesMois: 0,
    enLigne: true,
    statut: 'actif',
    onboarding: { etape: 3 },
    nbMembres: 1,
    siegesMax: 1,
    origine: 'onboarding',
    noteMoyenne: 4.5,
    nbAvis: 10,
    ...o.autres,
  });
  await db
    .doc(chemins.artisan(id))
    .set(versFirestore(a, (x, y) => new GeoPoint(x, y)) as Record<string, unknown>);
  return publierFiche({ db, horloge: () => T }, id);
}

describe('publierFiche (déclencheur projeterArtisan)', () => {
  it('fiche publique sans aucune donnée privée, labels vérifiés seulement', async () => {
    const r = await creerArtisan('a1');
    expect(r.statut).toBe('publiee');
    const brut = JSON.stringify((await db.doc(chemins.artisanPublic('a1')).get()).data());
    for (const prive of ['552100554', 'a1@prive.test', '1 rue privée', 'SARL', '+33556000090'])
      expect(brut).not.toContain(prive);
    expect((await db.doc(chemins.artisanPublic('a1')).get()).get('labels')).toEqual(['decennale']);
  });

  it('hors ligne ou supprimé : fiche retirée (FIC-02)', async () => {
    await creerArtisan('a1');
    await db.doc(chemins.artisan('a1')).update({ enLigne: false });
    expect((await publierFiche({ db, horloge: () => T }, 'a1')).statut).toBe('retiree');
    expect((await db.doc(chemins.artisanPublic('a1')).get()).exists).toBe(false);
    expect(await lireFichePublique(db, 'artisan-a1')).toBeNull();
  });

  it('fiche privée invalide : rien n’est publié', async () => {
    await db.doc(chemins.artisan('x')).set({ nomCommercial: 'X' });
    expect((await publierFiche({ db, horloge: () => T }, 'x')).statut).toBe('invalide');
    expect((await db.doc(chemins.artisanPublic('x')).get()).exists).toBe(false);
  });
});

describe('recherche géographique', () => {
  it('dans le rayon choisi ET dans la zone de l’artisan ; Premium à part', async () => {
    await creerArtisan('proche');
    await creerArtisan('pessac', { centre: { latitude: 44.8067, longitude: -0.6311 } });
    await creerArtisan('libourne', { centre: { latitude: 44.9153, longitude: -0.2439 } }); // ~28 km
    await creerArtisan('petitezone', {
      centre: { latitude: 44.9153, longitude: -0.2439 },
      rayonKm: 10,
    });
    await creerArtisan('paris', { centre: { latitude: 48.8566, longitude: 2.3522 } });
    await creerArtisan('prem', {
      autres: { plan: 'premium', optionVisibilite: true, siegesMax: 3, quotaDemandesMois: 4 },
    });
    const a20 = (await fichesAutour(db, BORDEAUX, 20)).map((a) => a.id).sort();
    expect(a20).toEqual(['pessac', 'prem', 'proche']);
    const a40 = (await fichesAutour(db, BORDEAUX, 40)).map((a) => a.id).sort();
    expect(a40).toEqual(['libourne', 'pessac', 'prem', 'proche']);

    const r = trierResultats(await fichesAutour(db, BORDEAUX, 40), lireFiltresAnnuaire({}));
    expect(r.premium.map((a) => a.id)).toEqual(['prem']);
    expect(r.premium[0]!.telephone).toBe('+33556000090');
    expect(r.standards.every((a) => a.telephone === null)).toBe(true);
  });
});

describe('lireFichePublique', () => {
  it('derniers avis publiés et réalisations publiées seulement', async () => {
    await creerArtisan('a1');
    const avis = (id: string, statut: string, jours: number) =>
      db.doc(chemins.avis(id)).set({
        artisanId: 'a1',
        statut,
        note: 5,
        nomAffiche: 'Camille M.',
        texte: 'Très bien',
        typeTravaux: 'Plomberie',
        createdAt: Timestamp.fromMillis(T),
        publieLe: Timestamp.fromMillis(T - jours * 86_400_000),
        criteres: {},
        pointsPositifs: [],
        photos: [],
        finChantier: '2026-05',
        preuve: { type: 'aucune' },
        certificationAcceptee: true,
        schemaVersion: 1,
      });
    await avis('v1', 'publie', 3);
    await avis('v2', 'publie', 1);
    await avis('v3', 'en_attente', 0);
    const f = await lireFichePublique(db, 'artisan-a1');
    expect(f?.id).toBe('a1');
    expect(f?.avis.map((a) => a.id)).toEqual(['v2', 'v1']);
  });
});
