import { describe, expect, it } from 'vitest';
import { labelsAuto, scoresNuit, syntheseScores, type AttributionScore } from '..';

const T = Date.UTC(2026, 9, 10, 3);
const H = 3_600_000;
const J = 24 * H;
const att = (
  statut: string,
  ilYa: number,
  delaiReponse?: number,
  extra: Partial<AttributionScore> = {},
): AttributionScore => ({
  statut,
  proposeeLe: T - ilYa,
  ...(delaiReponse !== undefined ? { reponduLe: T - ilYa + delaiReponse } : {}),
  ...extra,
});

describe('scoresNuit (MATCHING [10])', () => {
  it('taux, médiane du temps de réponse, fenêtres 7 et 30 jours', () => {
    const s = scoresNuit(
      [
        att('acceptee', 2 * J, 30 * 60_000),
        att('refusee', 3 * J, 2 * H),
        att('expiree', 10 * J),
        att('acceptee', 40 * J, 10 * 60_000),
        att('proposee', 1 * H),
        // Hors fenêtre de 90 jours, et déblocage d'un appel d'offres : ignorés.
        att('refusee', 100 * J, H),
        att('acceptee', 5 * J, 0, { appelOffresId: 'ao1' }),
      ],
      T,
    );
    expect(s).toEqual({
      nbProposees: 5,
      tauxReponse: 0.75,
      tempsReponseMoyenMin: 30,
      tauxAcceptation: 0.5,
      tauxRefus: 0.25,
      expirations30j: 1,
      attributions7j: 3,
      tauxRefus30j: 0.25,
    });
  });

  it('aucune attribution : rien à recopier sur la réactivité', () => {
    expect(scoresNuit([], T)).toEqual({
      nbProposees: 0,
      expirations30j: 0,
      attributions7j: 0,
      tauxRefus30j: 0,
    });
  });

  it('médiane sur un nombre pair de réponses', () => {
    expect(
      scoresNuit([att('acceptee', J, 10 * 60_000), att('acceptee', J, 20 * 60_000)], T)
        .tempsReponseMoyenMin,
    ).toBe(15);
  });
});

describe('labelsAuto', () => {
  it('« rapide » sous 24 h, « recommande » au-delà de 95 % avec 10 avis ; les autres labels restent', () => {
    expect(
      labelsAuto(
        ['decennale', 'recommande'],
        { tempsReponseMoyenMin: 120 },
        {
          tauxRecommandation: 0.97,
          nbAvis: 12,
        },
      ),
    ).toEqual(['decennale', 'rapide', 'recommande']);
    expect(
      labelsAuto(
        ['rapide', 'recommande'],
        { tempsReponseMoyenMin: 2000 },
        {
          tauxRecommandation: 0.97,
          nbAvis: 3,
        },
      ),
    ).toEqual([]);
    expect(labelsAuto(['rapide'], {}, { nbAvis: 0 })).toEqual(['rapide']);
  });
});

describe('syntheseScores', () => {
  it('qualité, réactivité et capacité sur 100', () => {
    const s = scoresNuit([att('acceptee', J, 60 * 60_000)], T);
    expect(syntheseScores(s, { noteMoyenne: 5, nbAvis: 200 })).toEqual({
      qualite: 99,
      reactivite: 98,
      capacite: 90,
    });
    expect(syntheseScores(scoresNuit([], T), { noteMoyenne: 0, nbAvis: 0 })).toMatchObject({
      reactivite: 60,
      capacite: 100,
    });
  });
});
