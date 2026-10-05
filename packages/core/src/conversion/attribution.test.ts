import { describe, expect, it } from 'vitest';
import { agregerJourCycle, attribuerConversion } from './attribution';

const J = 86_400_000;
const T = 100 * J;

describe('attribution d’une conversion (CONVERSION §8)', () => {
  it('dernier email planifié dans les 7 jours qui précèdent', () => {
    expect(
      attribuerConversion(
        [
          { modele: 'vis-position', le: T - 6 * J },
          { modele: 'vis-offre-lancement', le: T - 2 * J },
          { modele: 'trop-tard', le: T + 1 },
        ],
        T,
      ),
    ).toBe('vis-offre-lancement');
    expect(attribuerConversion([{ modele: 'vieux', le: T - 8 * J }], T)).toBeNull();
  });
});

describe('agrégat du jour (cycleStats)', () => {
  it('envois, ouvertures, clics, conversions et revenu par modèle ; témoin à part', () => {
    const a = agregerJourCycle({
      parEtape: { gratuit_actif: 10, visibilite: 2 },
      envois: ['vis-position', 'vis-position', 'prem-credits'],
      ouvertures: ['vis-position'],
      clics: ['vis-position'],
      conversions: [
        { modele: 'vis-offre-lancement', montantHtCentimes: 5593, temoin: false },
        { modele: null, montantHtCentimes: 7990, temoin: true },
      ],
      temoinEffectif: 3,
    });
    expect(a).toEqual({
      entonnoir: { gratuit_actif: 10, visibilite: 2 },
      envois: { 'vis-position': 2, 'prem-credits': 1 },
      ouvertures: { 'vis-position': 1 },
      clics: { 'vis-position': 1 },
      conversions: { 'vis-offre-lancement': 1, sans_email: 1 },
      revenuAttribueCentimes: { 'vis-offre-lancement': 5593 },
      temoin: { effectif: 3, conversions: 1 },
    });
  });
});
