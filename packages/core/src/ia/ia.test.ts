import { describe, expect, it } from 'vitest';
import {
  cleCacheAnalyse,
  controlerSortie,
  coutCentimes,
  ETAPES_ENTONNOIR,
  promptSysteme,
  schemaJsonSortie,
  sortieAnalyseIa,
  type SortieAnalyseIa,
} from './index';

const contexte = JSON.stringify({
  landings: {
    'acquisition-artisans': { sessions: 1234, conversion: '5 %', sortiesOffres: '62 %' },
  },
});
const reco = (titre: string, valeur = '62 %') => ({
  titre,
  perimetre: 'landing:acquisition-artisans',
  etape: 'Landing → intérêt' as const,
  gainEstime: '+1 à +2 pts',
  priorite: 1,
  impact: 'élevé' as const,
  effort: 'faible' as const,
  confiance: 0.7,
  constat: 'Beaucoup de sorties dans la section offres.',
  preuves: [{ source: 'comportementAgregats', ref: 'acquisition-artisans · 30 j', valeur }],
  action: { type: 'ab_test' as const, details: 'Tester les offres plus haut.' },
});
const sortie = (n: number, surcharge: Partial<SortieAnalyseIa> = {}): SortieAnalyseIa =>
  sortieAnalyseIa.parse({
    resume: 'Les offres font partir les visiteurs.',
    recommandations: Array.from({ length: n }, (_, i) => reco(`Reco ${i}`)),
    ...surcharge,
  });

describe('sortieAnalyseIa', () => {
  it('accepte une sortie conforme et refuse une étape inconnue', () => {
    expect(sortie(3).questionsOuvertes).toEqual([]);
    expect(
      sortieAnalyseIa.safeParse({ resume: 'x', recommandations: [{ ...reco('a'), etape: 'SEO' }] })
        .success,
    ).toBe(false);
  });
});

describe('controlerSortie (IA-01, IA-04)', () => {
  it('accepte 3 à 6 recommandations en mode rapide, toutes appuyées sur le contexte', () => {
    expect(controlerSortie(sortie(3), 'rapide', contexte)).toEqual([]);
    expect(controlerSortie(sortie(7), 'rapide', contexte)).toEqual([
      '7 recommandations au lieu de 3 à 6',
    ]);
  });

  it('refuse une valeur citée absente du contexte', () => {
    const s = sortie(3);
    s.recommandations[0] = reco('Inventée', '38 %');
    expect(controlerSortie(s, 'rapide', contexte)).toEqual([
      'valeur absente du contexte : « 38 % » (Inventée)',
    ]);
  });

  it('retrouve une valeur malgré espaces insécables, casse et virgule décimale', () => {
    const s = sortie(3);
    s.recommandations[0] = reco('Format', '1 234');
    expect(controlerSortie(s, 'rapide', contexte)).toEqual([]);
  });

  it('exige en audit les 7 étapes notées et 6 à 12 recommandations', () => {
    const etapes = ETAPES_ENTONNOIR.map((etape) => ({ etape, score: 50, constat: 'moyen' }));
    expect(controlerSortie(sortie(6, { etapes }), 'audit', contexte)).toEqual([]);
    expect(controlerSortie(sortie(6, { etapes: etapes.slice(1) }), 'audit', contexte)).toEqual([
      'étapes non notées : Acquisition (trafic)',
    ]);
    expect(controlerSortie(sortie(6), 'audit', contexte)[0]).toContain('étapes non notées');
  });
});

describe('coutCentimes', () => {
  it('compte entrée, sortie et cache, arrondi au centime supérieur', () => {
    expect(
      coutCentimes('claude-haiku-4-5', { entree: 10_000, sortie: 2000, cacheEcrit: 0, cacheLu: 0 }),
    ).toBe(2);
    expect(
      coutCentimes('claude-sonnet-5-5', {
        entree: 1000,
        sortie: 4000,
        cacheEcrit: 6000,
        cacheLu: 0,
      }),
    ).toBe(6);
    // Modèle inconnu : tarif le plus élevé, jamais sous-estimé.
    expect(coutCentimes('autre', { entree: 0, sortie: 0, cacheEcrit: 0, cacheLu: 100_000 })).toBe(
      2,
    );
  });
});

describe('prompt et cache', () => {
  it('interdit « lead » et ajoute les consignes de l’équipe', () => {
    expect(promptSysteme([])).toContain('n’écris jamais « lead »');
    expect(promptSysteme(['Ne plus proposer de pop-up'])).toContain('- Ne plus proposer de pop-up');
  });

  it('forme une clé stable quel que soit l’ordre des périmètres et la casse de la question', () => {
    expect(
      cleCacheAnalyse({
        mode: 'rapide',
        perimetres: ['offres', 'emails'],
        question: ' Pourquoi  ? ',
      }),
    ).toBe(
      cleCacheAnalyse({ mode: 'rapide', perimetres: ['emails', 'offres'], question: 'pourquoi ?' }),
    );
    expect(cleCacheAnalyse({ mode: 'audit', perimetres: ['landings'], approfondie: true })).toBe(
      'audit|landings|p|',
    );
  });

  it('décrit la sortie en schéma JSON strict', () => {
    const s = schemaJsonSortie() as { required: string[]; additionalProperties: boolean };
    expect(s.required).toEqual(['resume', 'recommandations', 'questionsOuvertes']);
    expect(s.additionalProperties).toBe(false);
  });
});
