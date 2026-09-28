import { describe, expect, it } from 'vitest';
import { artisan, artisanPublic } from '../schemas/artisans';
import {
  chipsFiltres,
  ecrireFiltresAnnuaire,
  filtrerAnnuaire,
  jsonLdArtisan,
  lireFiltresAnnuaire,
  pertinence,
  projeterArtisanPublic,
  sansFiltres,
  scoreClassement,
  type FicheAnnuaire,
} from './index';

const T = new Date(Date.UTC(2026, 8, 28));
const base = artisan.parse({
  schemaVersion: 1,
  createdAt: T,
  raisonSociale: 'Bertrand Rénovation SARL',
  nomCommercial: 'Bertrand Rénovation',
  slug: 'bertrand-renovation',
  siren: '552100554',
  siret: '55210055400013',
  adresseSiege: { ligne1: '12 rue des Lilas', codePostal: '33700', ville: 'Mérignac' },
  telephonePublic: '+33556000090',
  emailContact: 'contact@bertrand.test',
  metiers: ['plombier'],
  metierPrincipal: 'plombier',
  tags: ['douche italienne'],
  pitch: 'Salles de bain clés en main.',
  labels: ['decennale', 'rge', 'qualibat'],
  labelsVerifies: {
    decennale: { verifieLe: T, docId: 'd1' },
    rge: { verifieLe: T, expireLe: new Date(Date.UTC(2026, 0, 1)), docId: 'd2' },
  },
  zoneIntervention: {
    centre: { latitude: 44.84, longitude: -0.64 },
    geohash: 'ezzx',
    rayonKm: 30,
    rayonAccepteLe: T,
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
  noteMoyenne: 4.8,
  nbAvis: 24,
  completude: 90,
});

describe('projeterArtisanPublic', () => {
  it('fiche valide pour le schéma strict, sans aucune donnée personnelle (règle n° 8)', () => {
    const p = projeterArtisanPublic(base, T, 'Mérignac')!;
    expect(artisanPublic.safeParse(p).success).toBe(true);
    const texte = JSON.stringify(p);
    for (const prive of ['552100554', 'contact@bertrand.test', '12 rue des Lilas', 'SARL'])
      expect(texte).not.toContain(prive);
  });

  it('FIC-01 : seuls les labels vérifiés et non expirés', () => {
    expect(projeterArtisanPublic(base, T, 'Mérignac')!.labels).toEqual(['decennale']);
  });

  it('ANN-06 : téléphone seulement en Premium ou avec l’option Visibilité', () => {
    expect(projeterArtisanPublic(base, T, 'M')!.telephone).toBeNull();
    const visibilite = { ...base, plan: 'visibilite' as const, optionVisibilite: true };
    expect(projeterArtisanPublic(visibilite, T, 'M')!.telephone).toBe('+33556000090');
    const premium = { ...base, plan: 'premium' as const, optionVisibilite: true };
    expect(projeterArtisanPublic(premium, T, 'M')).toMatchObject({
      premium: true,
      telephone: '+33556000090',
    });
  });

  it('FIC-02 : hors ligne ou suspendu → pas de fiche publique', () => {
    expect(projeterArtisanPublic({ ...base, enLigne: false }, T, 'M')).toBeNull();
    expect(projeterArtisanPublic({ ...base, statut: 'suspendu' }, T, 'M')).toBeNull();
  });
});

describe('scoreClassement (MATCHING §4)', () => {
  it('sur 100, meilleur avec de bons avis et une bonne réactivité', () => {
    const bon = scoreClassement({
      noteMoyenne: 4.9,
      nbAvis: 80,
      tauxReponse: 0.95,
      tempsReponseMoyenMin: 60,
      completude: 100,
      delaiDispoJours: 2,
      anneesActivite: 12,
    });
    const moyen = scoreClassement({ noteMoyenne: 3.8, nbAvis: 3, completude: 40 });
    expect(bon).toBeGreaterThan(moyen);
    expect(bon).toBeLessThanOrEqual(100);
    expect(moyen).toBeGreaterThanOrEqual(0);
  });
  it('pertinence = score − 0,6 × km quand le score existe', () => {
    expect(pertinence({ note: 5, avis: 100, km: 10, score: 80 })).toBe(74);
  });
});

describe('filtres dans l’URL (ANN-01, ANN-02)', () => {
  it('aller-retour : l’URL relue redonne les mêmes filtres', () => {
    const f = lireFiltresAnnuaire(
      new URLSearchParams(
        'metier=plombier,carreleur&rayon=30&note=4.5&labels=rge&dispo=semaine&budget=moyen&tri=note&q=douche',
      ),
    );
    expect(f).toMatchObject({
      metier: ['plombier', 'carreleur'],
      rayon: 30,
      note: 4.5,
      labels: ['rge'],
    });
    expect(lireFiltresAnnuaire(new URLSearchParams(ecrireFiltresAnnuaire(f).slice(1)))).toEqual(f);
  });

  it('valeurs inconnues ignorées, jamais d’erreur', () => {
    const f = lireFiltresAnnuaire({
      rayon: '999',
      note: '3',
      labels: 'inconnu,rge',
      dispo: 'x',
      tri: 'prix',
    });
    expect(f).toMatchObject({
      rayon: 20,
      note: 0,
      labels: ['rge'],
      dispo: 'tous',
      tri: 'pertinence',
    });
    expect(ecrireFiltresAnnuaire(lireFiltresAnnuaire({}))).toBe('');
  });

  it('une chip par filtre actif ; la retirer ne touche pas les autres ; tout effacer', () => {
    const f = lireFiltresAnnuaire({
      metier: 'plombier,carreleur',
      note: '4',
      rayon: '40',
      ville: 'Pessac',
    });
    const chips = chipsFiltres(f, (id) => id.toUpperCase());
    expect(chips.map((c) => c.libelle)).toEqual([
      'PLOMBIER',
      'CARRELEUR',
      'Note 4 et +',
      'Rayon 40 km',
    ]);
    expect(chips[0]!.sans.metier).toEqual(['carreleur']);
    expect(chips[0]!.sans.note).toBe(4);
    expect(chipsFiltres(sansFiltres(f), String)).toEqual([]);
    expect(sansFiltres(f).ville).toBe('Pessac');
  });
});

describe('recherche plein texte de repli (ANN-04)', () => {
  const fiche = (id: string, tags: string[]): FicheAnnuaire => ({
    id,
    nom: id,
    metiers: [],
    pitch: '',
    tags,
    km: 1,
    note: 4,
    avis: 1,
    premium: false,
    labels: [],
    delaiJ: 1,
    budgetCle: 'petit',
  });
  it('« douche italienne » trouve le tag, accents et ordre des mots ignorés', () => {
    const r = filtrerAnnuaire(
      [fiche('a', ['Douche à l’italienne']), fiche('b', ['douche']), fiche('c', ['cuisine'])],
      { q: 'douche italienne', rayonKm: 30 },
    );
    expect(r.map((x) => x.id)).toEqual(['a']);
  });
});

describe('JSON-LD LocalBusiness (FIC-03)', () => {
  const f = {
    slug: 'b',
    nomCommercial: 'B',
    pitch: 'p',
    description: '',
    ville: 'Mérignac',
    geo: { latitude: 44.84321, longitude: -0.64321 },
    noteMoyenne: 4.83,
    nbAvis: 24,
    telephone: null,
  };
  it('note et nombre d’avis', () => {
    expect(jsonLdArtisan(f, 'https://x.fr')).toMatchObject({
      '@type': 'LocalBusiness',
      url: 'https://x.fr/artisans/b',
      aggregateRating: { ratingValue: 4.8, reviewCount: 24 },
    });
  });
  it('sans avis : pas de note déclarée', () => {
    expect(jsonLdArtisan({ ...f, nbAvis: 0 }, 'https://x.fr')).not.toHaveProperty(
      'aggregateRating',
    );
  });
});
