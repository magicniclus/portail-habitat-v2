import { droitsInitiaux } from '@ph/core/paiements';
import { encoderGeohash } from '@ph/core/geo';
import type { CommuneCandidate } from '@ph/core/pages-secteur';
import { artisan, artisanPublic, type CommuneSecteur } from '@ph/core/schemas';
import { GeoPoint, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appAdmin, PROJET_EMULATEUR } from '../src/admin';
import { chemins } from '../src/chemins';
import { depuisFirestore, versFirestore } from '../src/conversion';
import { publierFiche } from '../src/serveur/annuaire';
import {
  bloquerPage,
  lirePageSecteur,
  pagesIndexables,
  recompterPages,
  suivreArtisan,
  type SourceCommunes,
} from '../src/serveur/pagesSecteur';

const T = Date.UTC(2026, 10, 24, 10);
let db: Firestore;

const c = (
  nom: string,
  latitude: number,
  longitude: number,
  population: number,
): CommuneSecteur => ({
  nom,
  slug: nom.toLowerCase().replace(/[^a-z]+/g, '-'),
  codePostal: '33000',
  departement: '33',
  population,
  centre: { latitude, longitude },
});
const CENON = c('Cenon', 44.857, -0.531, 24_000);
const BORDEAUX = c('Bordeaux', 44.8378, -0.5792, 260_000);
const LORMONT = c('Lormont', 44.879, -0.522, 23_000);
const HAMEAU = c('Hameau', 44.86, -0.53, 400);
const ARCACHON = c('Arcachon', 44.658, -1.168, 11_000);

/** Source de communes de test : la plus proche du point, et les communes du rayon. */
const communes: SourceCommunes = {
  async duPoint(p) {
    return [CENON, BORDEAUX, LORMONT, HAMEAU, ARCACHON].sort(
      (a, b) =>
        Math.hypot(a.centre.latitude - p.latitude, a.centre.longitude - p.longitude) -
        Math.hypot(b.centre.latitude - p.latitude, b.centre.longitude - p.longitude),
    )[0]!;
  },
  async autour(p, rayonKm) {
    const r: CommuneCandidate[] = [];
    for (const x of [CENON, BORDEAUX, LORMONT, HAMEAU, ARCACHON]) {
      const km = Math.hypot(x.centre.latitude - p.latitude, x.centre.longitude - p.longitude) * 111;
      if (km <= rayonKm) r.push({ ...x, distanceKm: km });
    }
    return r;
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
});

async function ecrireArtisan(
  id: string,
  o: {
    centre?: { latitude: number; longitude: number };
    metiers?: string[];
    enLigne?: boolean;
  } = {},
) {
  const centre = o.centre ?? CENON.centre;
  const metiers = o.metiers ?? ['plombier'];
  const a = artisan.parse({
    schemaVersion: 1,
    createdAt: new Date(T),
    raisonSociale: `${id} SARL`,
    nomCommercial: `Artisan ${id}`,
    slug: `artisan-${id}`,
    siren: '552100554',
    siret: '55210055400013',
    adresseSiege: { ligne1: '1 rue', codePostal: '33150', ville: 'Cenon' },
    telephonePublic: '+33556000090',
    emailContact: `${id}@prive.test`,
    metiers,
    metierPrincipal: metiers[0],
    tags: [],
    labels: [],
    labelsVerifies: {},
    zoneIntervention: {
      centre,
      geohash: encoderGeohash(centre.latitude, centre.longitude),
      rayonKm: 25,
      rayonAccepteLe: new Date(T),
    },
    source: 'direct',
    droits: droitsInitiaux('gratuit', new Date(0)),
    verification: { statut: 'verifie' },
    quotaDemandesMois: 0,
    enLigne: o.enLigne ?? true,
    statut: 'actif',
    onboarding: { etape: 3 },
    nbMembres: 1,
    siegesMax: 1,
    origine: 'onboarding',
    noteMoyenne: 4.5,
    nbAvis: 10,
  });
  const avant = await fichePublique(id);
  await db
    .doc(chemins.artisan(id))
    .set(versFirestore(a, (x, y) => new GeoPoint(x, y)) as Record<string, unknown>);
  await publierFiche({ db, horloge: () => T }, id);
  return { avant, apres: await fichePublique(id) };
}

async function fichePublique(id: string) {
  const s = await db.doc(chemins.artisanPublic(id)).get();
  return s.exists ? artisanPublic.parse(depuisFirestore(s.data())) : undefined;
}

const ctx = () => ({ db, horloge: () => T, communes });

describe('pages de secteur : création et indexation', () => {
  it('artisan mis en ligne : page de sa commune + grandes voisines de sa zone, indexées', async () => {
    const { avant, apres } = await ecrireArtisan('a1');
    const r = await suivreArtisan(ctx(), avant, apres);
    expect(r.creees.sort()).toEqual(['plombier__bordeaux', 'plombier__cenon', 'plombier__lormont']);
    const p = await lirePageSecteur(db, 'plombier__cenon');
    expect(p).toMatchObject({ nbArtisans: 1, indexable: true, texteEtat: 'absent' });
    // Petite commune (moins de 5 000 habitants) et commune hors de la zone : pas de page.
    expect(await lirePageSecteur(db, 'plombier__hameau')).toBeUndefined();
    expect(await lirePageSecteur(db, 'plombier__arcachon')).toBeUndefined();
  });

  it('modification sans effet (note, pitch) : rien n’est relu ni écrit', async () => {
    const { apres } = await ecrireArtisan('a1');
    await suivreArtisan(ctx(), undefined, apres);
    const r = await suivreArtisan(ctx(), apres, { ...apres!, pitch: 'Nouveau pitch' });
    expect(r).toEqual({ creees: [], maj: [] });
  });

  it('artisan hors ligne : pages désindexées, jamais supprimées ; de retour : réindexées', async () => {
    const un = await ecrireArtisan('a1');
    await suivreArtisan(ctx(), un.avant, un.apres);
    const hors = await ecrireArtisan('a1', { enLigne: false });
    const r = await suivreArtisan(ctx(), hors.avant, hors.apres);
    expect(r.maj).toContain('plombier__cenon');
    expect(await lirePageSecteur(db, 'plombier__cenon')).toMatchObject({
      nbArtisans: 0,
      indexable: false,
    });
    const retour = await ecrireArtisan('a1');
    await suivreArtisan(ctx(), retour.avant, retour.apres);
    expect((await lirePageSecteur(db, 'plombier__cenon'))?.indexable).toBe(true);
  });

  it('un autre métier dans la même commune : sa propre page, sans toucher les autres', async () => {
    const un = await ecrireArtisan('a1');
    await suivreArtisan(ctx(), un.avant, un.apres);
    const deux = await ecrireArtisan('a2', { metiers: ['electricien'] });
    const r = await suivreArtisan(ctx(), deux.avant, deux.apres);
    expect(r.creees).toContain('electricien__cenon');
    expect(r.maj).toEqual([]);
    expect((await lirePageSecteur(db, 'plombier__cenon'))?.nbArtisans).toBe(1);
  });

  it('recomptage de nuit : corrige un compte faux, par lots', async () => {
    const un = await ecrireArtisan('a1');
    await suivreArtisan(ctx(), un.avant, un.apres);
    // Artisan retiré sans déclencheur (panne) : le compte est faux jusqu’à la nuit.
    await db.doc(chemins.artisan('a1')).update({ enLigne: false });
    await publierFiche({ db, horloge: () => T }, 'a1');
    const lot = await recompterPages({ db, horloge: () => T }, { limite: 2 });
    expect(lot.lues).toBe(2);
    const suite = await recompterPages({ db, horloge: () => T }, { apres: lot.dernier! });
    expect(lot.maj + suite.maj).toBe(3);
    expect(await pagesIndexables(db)).toEqual([]);
  });

  it('page bloquée par l’admin : jamais indexée, même avec des artisans', async () => {
    const un = await ecrireArtisan('a1');
    await suivreArtisan(ctx(), un.avant, un.apres);
    expect(await bloquerPage({ db, horloge: () => T }, 'plombier__cenon', true)).toBe(true);
    expect((await pagesIndexables(db)).map((p) => p.id)).not.toContain('plombier__cenon');
    await recompterPages({ db, horloge: () => T });
    expect((await lirePageSecteur(db, 'plombier__cenon'))?.indexable).toBe(false);
    await bloquerPage({ db, horloge: () => T }, 'plombier__cenon', false);
    expect((await lirePageSecteur(db, 'plombier__cenon'))?.indexable).toBe(true);
    expect(await bloquerPage({ db, horloge: () => T }, 'inconnue__x', true)).toBe(false);
  });
});
