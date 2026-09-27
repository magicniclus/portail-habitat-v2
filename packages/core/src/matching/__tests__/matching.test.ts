import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aiguiller,
  aModerer,
  distanceKm,
  evaluer,
  noteBayesienne,
  qualiteLead,
  selectionner,
  type ArtisanMatching,
  type Candidat,
  type ConfigMatching,
  type DemandeMatching,
  type SignauxLead,
} from '..';
import { aleatoire } from './aleatoire';

const lire = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), 'utf8'));
const { config } = lire('../../../../../docs/data/matching-config.json') as {
  config: ConfigMatching;
};
const { cas } = lire('matching.cases.json') as {
  cas: {
    artisan: ArtisanMatching;
    demande: DemandeMatching & { dejaVus: string[] };
    attendu: { raison?: string; score?: number };
  }[];
};

describe('filtres durs et score (implémentation de référence)', () => {
  it('au moins 30 cas, toutes les raisons représentées', () => {
    expect(cas.length).toBeGreaterThanOrEqual(30);
    const raisons = new Set(cas.map((c) => c.attendu.raison ?? 'retenu'));
    for (const r of [
      'metier',
      'distance',
      'non_verifie',
      'assurance',
      'exigence:rge',
      'sanction',
      'quota',
      'deja_vu',
      'conflit',
      'pause',
      'budget',
      'retenu',
    ])
      expect(raisons).toContain(r);
  });
  it.each(cas.map((c, i) => [i, c] as const))('cas %i', (_, c) => {
    const [r] = evaluer([c.artisan], c.demande, config, new Set(c.demande.dejaVus));
    expect(r!.raisonExclusion).toBe(c.attendu.raison);
    if (c.attendu.score !== undefined) expect(r!.score).toBeCloseTo(c.attendu.score, 6);
  });
});

// --- Jeu de données maîtrisé -------------------------------------------------------------
const T0 = Date.UTC(2026, 9, 1);
const JOUR = 86_400_000;
const BORDEAUX = { latitude: 44.8378, longitude: -0.5792 };
/** Point à `km` kilomètres au nord de Bordeaux. */
const auNord = (km: number) => ({
  latitude: BORDEAUX.latitude + km / 111.195,
  longitude: BORDEAUX.longitude,
});

const demande = (x: Partial<DemandeMatching> = {}): DemandeMatching => ({
  id: 'd1',
  geo: BORDEAUX,
  metierRequis: 'plombier',
  exigences: [],
  budgetMinCentimes: 500_000,
  budgetMaxCentimes: 1_000_000,
  delaiSouhaiteJours: 30,
  demarrageLe: T0,
  motsReponses: [],
  empreintesDemandeur: ['h-client'],
  ...x,
});
const artisan = (id: string, x: Partial<ArtisanMatching> = {}): ArtisanMatching => ({
  id,
  siren: `siren-${id}`,
  geo: auNord(5),
  rayonKm: 30,
  metierPrincipal: 'plombier',
  metiersSecondaires: [],
  intentions: [],
  tags: [],
  verifie: true,
  decennaleExpireLe: T0 + 365 * JOUR,
  qualifications: ['decennale'],
  sanctionActive: false,
  enPause: false,
  demandesRecuesMois: 0,
  quotaDemandesMois: 4,
  empreintes: [`h-${id}`],
  budgetMinCentimes: 300_000,
  budgetMaxCentimes: 2_000_000,
  premium: false,
  optionVisibilite: false,
  note: 4.6,
  nbAvis: 20,
  tauxRecommandation: 0.9,
  tauxReponse: 0.9,
  tempsReponseMoyenMin: 120,
  delaiDispoJours: 10,
  completude: 80,
  attributions7j: 0,
  tauxRefus30j: 0,
  joursDepuisVerification: 365,
  ...x,
});
const un = (a: ArtisanMatching, d = demande(), dejaVus = new Set<string>()) =>
  evaluer([a], d, config, dejaVus)[0]!;

describe('chaque filtre dur exclut et consigne sa raison (§5)', () => {
  it.each([
    ['metier', artisan('a', { metierPrincipal: 'electricien' })],
    ['distance', artisan('a', { geo: auNord(40) })],
    ['non_verifie', artisan('a', { verifie: false })],
    ['assurance', artisan('a', { decennaleExpireLe: undefined })],
    ['assurance', artisan('a', { decennaleExpireLe: T0 + 5 * JOUR })],
    ['exigence:rge', artisan('a')],
    ['sanction', artisan('a', { sanctionActive: true })],
    ['quota', artisan('a', { demandesRecuesMois: 4 })],
    ['conflit', artisan('a', { empreintes: ['h-client'] })],
    ['pause', artisan('a', { enPause: true })],
    ['budget', artisan('a', { budgetMinCentimes: 2_500_000, budgetMaxCentimes: 9_000_000 })],
  ] as const)('%s', (raison, a) => {
    const d = demande({
      exigences: raison === 'exigence:rge' ? ['rge'] : [],
      demarrageLe: raison === 'assurance' ? T0 + 10 * JOUR : T0,
    });
    expect(un(a, d).raisonExclusion).toBe(raison);
  });
  it('deja_vu : aucun artisan sollicité deux fois (réattribution)', () => {
    expect(un(artisan('a'), demande(), new Set(['a'])).raisonExclusion).toBe('deja_vu');
  });
  it('score_faible', () => {
    const faible = artisan('a', {
      geo: auNord(29),
      metiersSecondaires: ['plombier'],
      metierPrincipal: 'carreleur',
      note: 3,
      nbAvis: 100,
      tauxRecommandation: 0,
      tauxReponse: 0,
      tempsReponseMoyenMin: 5000,
      delaiDispoJours: 90,
      completude: 0,
      tauxRefus30j: 0.9,
      attributions7j: 20,
    });
    expect(un(faible).raisonExclusion).toBe('score_faible');
  });
  it('compétent par l’intention même si le métier diffère', () => {
    const a = artisan('a', { metierPrincipal: 'carreleur', intentions: ['sdb-italienne'] });
    expect(un(a, demande({ intention: 'sdb-italienne' })).raisonExclusion).toBeUndefined();
  });
  it('rayon plafonné par la configuration', () => {
    const a = artisan('a', { rayonKm: 100, geo: auNord(70) });
    expect(un(a).raisonExclusion).toBe('distance');
  });
});

describe('score (§4)', () => {
  it('moyenne bayésienne : 0 avis → moyenne plateforme', () => {
    expect(noteBayesienne(5, 0)).toBe(4.3);
    expect(noteBayesienne(5, 5)).toBeCloseTo(4.65, 10);
  });
  it('tags : +0,1 par tag reconnu dans les réponses, plafonné à 1', () => {
    const a = artisan('a', {
      metierPrincipal: 'carreleur',
      metiersSecondaires: ['plombier'],
      tags: ['douche italienne', 'Faïence'],
    });
    const r = un(a, demande({ motsReponses: ['Douche à l’italienne', 'faience murale'] }));
    expect(r.sousScores!.competence).toBeCloseTo(0.9, 10);
  });
  it('distance nulle : 1 ; au bord du rayon : 0', () => {
    expect(un(artisan('a', { geo: BORDEAUX })).sousScores!.distance).toBe(1);
    expect(un(artisan('a', { geo: auNord(29.99) })).sousScores!.distance).toBeLessThan(0.01);
  });
  it('disponibilité : pénalité linéaire sur 30 jours', () => {
    expect(un(artisan('a', { delaiDispoJours: 45 })).sousScores!.disponibilite).toBeCloseTo(
      0.5,
      10,
    );
    expect(
      un(artisan('a', { delaiDispoJours: 45 }), demande({ delaiSouhaiteJours: null })).sousScores!
        .disponibilite,
    ).toBe(1);
  });
  it('budget inconnu : adéquation neutre 0,5 (D48)', () => {
    expect(un(artisan('a', { budgetMinCentimes: undefined })).sousScores!.adequationBudget).toBe(
      0.5,
    );
  });
  it('budget ponctuel de la demande', () => {
    const d = demande({ budgetMinCentimes: 800_000, budgetMaxCentimes: 800_000 });
    expect(un(artisan('a'), d).sousScores!.adequationBudget).toBe(1);
    expect(
      un(artisan('a', { budgetMinCentimes: 900_000, budgetMaxCentimes: 950_000 }), d).sousScores!
        .adequationBudget,
    ).toBe(0);
  });
  it('ajustements : Premium +12, visibilité +4, nouveau +6, saturation −10, refus −8', () => {
    const base = un(artisan('a')).score;
    expect(un(artisan('a', { premium: true })).score).toBeCloseTo(base + 12, 6);
    expect(un(artisan('a', { optionVisibilite: true })).score).toBeCloseTo(base + 4, 6);
    expect(un(artisan('a', { joursDepuisVerification: 30 })).score).toBeCloseTo(base + 6, 6);
    expect(un(artisan('a', { attributions7j: 9 })).score).toBeCloseTo(base - 10, 6);
    expect(un(artisan('a', { attributions7j: 8 })).score).toBeCloseTo(base, 6);
    expect(un(artisan('a', { tauxRefus30j: 0.51 })).score).toBeCloseTo(base - 8, 6);
  });
  it('distance haversine Bordeaux → Paris ≈ 499 km', () => {
    expect(distanceKm(BORDEAUX, { latitude: 48.8566, longitude: 2.3522 })).toBeCloseTo(499, 0);
  });
});

/** Population aléatoire d'artisans éligibles, pour les propriétés de la sélection. */
function population(graine: number, n: number): ArtisanMatching[] {
  const h = aleatoire(graine);
  return Array.from({ length: n }, (_, i) =>
    artisan(`a${i}`, {
      siren: `s${Math.floor(h() * n * 0.7)}`,
      geo: auNord(h() * 25),
      premium: h() < 0.5,
      note: 3.5 + h() * 1.5,
      nbAvis: Math.floor(h() * 80),
      tauxReponse: h(),
      optionVisibilite: h() < 0.2,
      derniereAttributionLe: h() < 0.5 ? T0 - Math.floor(h() * 20) * JOUR : undefined,
    }),
  );
}

describe('sélection équitable (§3 [5] et §5)', () => {
  const graines = Array.from({ length: 40 }, (_, i) => 1000 + i);
  it.each(graines)('graine %i : quota Premium, un non-Premium, SIREN distincts, ordre', (g) => {
    const cands = evaluer(population(g, 12), demande(), config);
    const r = selectionner(cands, config, 3);
    expect(r.length).toBeLessThanOrEqual(3);
    expect(r.filter((x) => x.premium).length).toBeLessThanOrEqual(config.quotaPremiumMax);
    const nonPremiumEligible = cands.some((x) => !x.raisonExclusion && !x.premium);
    if (nonPremiumEligible && r.length === 3) expect(r.some((x) => !x.premium)).toBe(true);
    expect(new Set(r.map((x) => x.siren)).size).toBe(r.length);
    expect(r.every((x) => !x.raisonExclusion)).toBe(true);
  });
  it.each(graines)('graine %i : artisan ciblé éligible toujours en rang 1', (g) => {
    const pop = population(g, 12);
    const cible = pop[g % 12]!.id;
    const r = selectionner(evaluer(pop, demande(), config), config, 3, cible);
    expect(r[0]!.artisanId).toBe(cible);
  });
  it('artisan ciblé exclu : ignoré', () => {
    const pop = [artisan('cible', { enPause: true }), artisan('b')];
    expect(
      selectionner(evaluer(pop, demande(), config), config, 3, 'cible').map((x) => x.artisanId),
    ).toEqual(['b']);
  });
  it('déterministe : même configuration et mêmes données → même résultat, quel que soit l’ordre d’entrée', () => {
    const pop = population(7, 15);
    const a = selectionner(evaluer(pop, demande(), config), config, 3);
    const b = selectionner(evaluer([...pop].reverse(), demande(), config), config, 3);
    expect(b).toEqual(a);
  });
  it('égalité de score : le plus proche, puis la dernière attribution la plus ancienne', () => {
    const pop = [
      artisan('recent', { derniereAttributionLe: T0 - JOUR }),
      artisan('ancien', { derniereAttributionLe: T0 - 10 * JOUR }),
      artisan('jamais'),
      artisan('proche', { geo: auNord(4.99), derniereAttributionLe: T0 }),
    ];
    const cands = evaluer(pop, demande(), { ...config, poids: { ...config.poids, distance: 0 } });
    const r = selectionner(cands, { ...config, garantirUnNonPremium: false }, 4);
    expect(r.map((x) => x.artisanId)).toEqual(['proche', 'jamais', 'ancien', 'recent']);
  });
  it('trois Premium mieux classés : le troisième cède sa place à un non-Premium', () => {
    const pop = [
      artisan('p1', { premium: true }),
      artisan('p2', { premium: true }),
      artisan('p3', { premium: true }),
      artisan('libre', { note: 3.5, nbAvis: 50 }),
    ];
    const r = selectionner(evaluer(pop, demande(), config), config, 3);
    expect(r.map((x) => x.artisanId)).toEqual(['p1', 'p2', 'libre']);
  });
  it('quota Premium respecté même sans garantie de non-Premium', () => {
    const pop = ['p1', 'p2', 'p3'].map((id) => artisan(id, { premium: true }));
    pop.push(artisan('l1', { note: 3.5 }), artisan('l2', { note: 3.5 }));
    const sansGarantie = { ...config, garantirUnNonPremium: false };
    expect(
      selectionner(evaluer(pop, demande(), config), sansGarantie, 3).map((x) => x.artisanId),
    ).toEqual(['p1', 'p2', 'l1']);
    const quota1 = { ...sansGarantie, quotaPremiumMax: 1 };
    expect(
      selectionner(evaluer(pop, demande(), config), quota1, 3).map((x) => x.artisanId),
    ).toEqual(['p1', 'l1', 'l2']);
  });
  it('quota Premium à 3 : le non-Premium est tout de même garanti', () => {
    const pop = ['p1', 'p2', 'p3']
      .map((id) => artisan(id, { premium: true }))
      .concat(artisan('libre', { note: 3.5 }));
    const r = selectionner(evaluer(pop, demande(), config), { ...config, quotaPremiumMax: 3 }, 3);
    expect(r.map((x) => x.artisanId)).toEqual(['p1', 'p2', 'libre']);
  });
  it('aucun non-Premium : que des Premium, dans la limite du quota', () => {
    const pop = ['p1', 'p2', 'p3'].map((id) => artisan(id, { premium: true }));
    const r = selectionner(
      evaluer(pop, demande(), { ...config }),
      { ...config, quotaPremiumMax: 3 },
      3,
    );
    expect(r).toHaveLength(3);
  });
  it('même entreprise (SIREN) : un seul retenu', () => {
    const pop = [artisan('a', { siren: 'X' }), artisan('b', { siren: 'X' }), artisan('c')];
    expect(
      selectionner(evaluer(pop, demande(), config), config, 3).map((x) => x.artisanId),
    ).toEqual(['a', 'c']);
  });
});

describe('aiguillage d’une demande du site (D41)', () => {
  const cands = (pop: ArtisanMatching[]) => evaluer(pop, demande(), config);
  it('un Premium avec du quota : demande garantie à un seul artisan', () => {
    const r = aiguiller(cands([artisan('libre', { note: 5 }), artisan('prem', { premium: true })]));
    expect(r).toMatchObject({ canal: 'garantie', artisan: { artisanId: 'prem' } });
  });
  it('Premium sans quota : appel d’offres', () => {
    const r = aiguiller(
      cands([artisan('libre'), artisan('prem', { premium: true, demandesRecuesMois: 4 })]),
    );
    expect(r.canal).toBe('appel_offres');
    expect((r as { eligibles: Candidat[] }).eligibles.map((x) => x.artisanId)).toEqual(['libre']);
  });
  it('artisan ciblé Premium : il reçoit la demande garantie', () => {
    const r = aiguiller(
      cands([
        artisan('p1', { premium: true, note: 5 }),
        artisan('p2', { premium: true, note: 3.6 }),
      ]),
      'p2',
    );
    expect(r).toMatchObject({ canal: 'garantie', artisan: { artisanId: 'p2' } });
  });
  it('artisan ciblé gratuit sans Premium disponible : en tête de l’appel d’offres (D48)', () => {
    const r = aiguiller(
      cands([artisan('a', { note: 5 }), artisan('cible', { note: 3.6 })]),
      'cible',
    );
    expect(r.canal === 'appel_offres' && r.eligibles.map((x) => x.artisanId)).toEqual([
      'cible',
      'a',
    ]);
  });
  it('aucun éligible : appel d’offres vide', () => {
    expect(aiguiller(cands([artisan('a', { enPause: true })]))).toEqual({
      canal: 'appel_offres',
      eligibles: [],
    });
  });
});

describe('qualité de la demande (MATCHING [9])', () => {
  const s: SignauxLead = {
    emailVerifie: true,
    telephoneVerifie: true,
    tauxReponses: 1,
    photos: true,
    longueurPrecisions: 80,
    delaiSouhaiteJours: 30,
    budgetCoherent: true,
    dejaVus7j: 0,
    emailJetable: false,
    horsZone: false,
  };
  it('parfaite : 100', () => expect(qualiteLead(s)).toBe(100));
  it('seuils : 80 % des champs, 60 caractères, 3 mois', () => {
    expect(
      qualiteLead({ ...s, tauxReponses: 0.79, longueurPrecisions: 59, delaiSouhaiteJours: 91 }),
    ).toBe(65);
    expect(qualiteLead({ ...s, delaiSouhaiteJours: null })).toBe(90);
  });
  it('fraude : email jetable, doublons, hors zone → bornée à 0 et modérée', () => {
    const f = qualiteLead({
      ...s,
      emailVerifie: false,
      telephoneVerifie: false,
      emailJetable: true,
      dejaVus7j: 3,
      horsZone: true,
    });
    expect(f).toBe(0);
    expect(aModerer(f)).toBe(true);
    expect(aModerer(30)).toBe(false);
  });
});
