import { describe, expect, it } from 'vitest';
import { creneauxDuJour, meilleuresHeures, prochainCreneau } from './index';

const h = (x: number) => x * 60;

describe('calendrier de publication', () => {
  it('répartit les créneaux de 8 h à 21 h, au quart d’heure', () => {
    expect(creneauxDuJour(1)).toEqual([h(14.5)]);
    expect(creneauxDuJour(2)).toEqual([h(11.25), h(17.75)]);
    expect(creneauxDuJour(0)).toEqual([]);
    expect(creneauxDuJour(30)).toHaveLength(30);
  });

  it('les heures qui marchent passent devant', () => {
    expect(creneauxDuJour(3, undefined, [19, 12])).toEqual([h(12), h(14.5), h(19)]);
  });

  it('prochain créneau libre, à 30 min des publications déjà prévues', () => {
    const c = creneauxDuJour(4);
    expect(prochainCreneau(c, [], h(9))).toBe(c[0]);
    expect(prochainCreneau(c, [c[0]! + 10], h(9))).toBe(c[1]);
    expect(prochainCreneau(c, [], h(22))).toBeNull();
  });

  it('meilleures heures selon vos résultats, avec assez de vidéos', () => {
    expect(
      meilleuresHeures([
        { heure: 12, score: 10 },
        { heure: 12, score: 30 },
        { heure: 19, score: 50 },
        { heure: 19, score: 70 },
        { heure: 8, score: 999 },
      ]),
    ).toEqual([19, 12]);
    expect(meilleuresHeures([])).toEqual([]);
  });
});
