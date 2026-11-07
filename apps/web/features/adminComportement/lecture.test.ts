import { describe, expect, it } from 'vitest';
import { lireFiltres } from './filtres';
import { dureeReplay, etatReplay, type Evenement } from './lecture';

const evenements: Evenement[] = [
  [0, 0, 100, 100],
  [500, 2, 0, 300],
  [800, 1, 200, 400],
  [3000, 0, 250, 450],
];

describe('etatReplay', () => {
  it('place le curseur, garde la trace et les clics récents, suit le défilement', () => {
    expect(etatReplay(evenements, 900)).toEqual({
      curseur: [200, 400],
      trace: [
        [100, 100],
        [200, 400],
      ],
      clics: [{ x: 200, y: 400, age: 100 }],
      haut: 300,
    });
    expect(etatReplay(evenements, 3000).clics).toEqual([]);
    expect(etatReplay(evenements, -1)).toMatchObject({ curseur: null, haut: 0 });
  });

  it('donne la durée du replay', () => {
    expect(dureeReplay(evenements)).toBe(3000);
    expect(dureeReplay([])).toBe(0);
  });
});

describe('lireFiltres', () => {
  it('lit les filtres de l’URL et refuse les valeurs inconnues', () => {
    expect(
      lireFiltres({ page: 'accueil', appareil: 'mobile', periode: '7j', onglet: 'replays' }),
    ).toEqual({
      page: 'accueil',
      appareil: 'mobile',
      periode: '7j',
      onglet: 'replays',
    });
    expect(lireFiltres({ page: 'mon-espace', appareil: ['x'] })).toEqual({
      page: 'acquisition-artisans',
      appareil: 'ordinateur',
      periode: '30j',
      onglet: 'cartes',
    });
  });
});
