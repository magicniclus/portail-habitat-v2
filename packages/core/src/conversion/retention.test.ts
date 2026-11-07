import { describe, expect, it } from 'vitest';
import { alternativeResiliation } from './retention';

const J = 86_400_000;
const T = 1000 * J;

describe('alternative à la résiliation (CONVERSION S8)', () => {
  it('trop cher : Premium → Visibilité ; Visibilité → −50 % pendant 2 mois', () => {
    expect(alternativeResiliation('trop_cher', { produit: 'premium', maintenant: T })).toEqual({
      type: 'descendre',
    });
    expect(alternativeResiliation('trop_cher', { produit: 'visibilite', maintenant: T })).toEqual({
      type: 'remise',
      pourcentage: 50,
      mois: 2,
    });
  });
  it('pas assez de demandes : −50 % ; saison creuse : suspension 2 mois ; autre : appel', () => {
    const o = { produit: 'premium' as const, maintenant: T };
    expect(alternativeResiliation('pas_assez_demandes', o)).toMatchObject({ type: 'remise' });
    expect(alternativeResiliation('saison_creuse', o)).toEqual({ type: 'suspendre', mois: 2 });
    expect(alternativeResiliation('autre', o)).toEqual({ type: 'appel' });
  });
  it('une seule offre de rétention par 12 mois : sinon, un appel', () => {
    const o = { produit: 'premium' as const, maintenant: T, derniereOffreRetention: T - 100 * J };
    expect(alternativeResiliation('pas_assez_demandes', o)).toEqual({ type: 'appel' });
    expect(alternativeResiliation('saison_creuse', o)).toEqual({ type: 'appel' });
    expect(alternativeResiliation('trop_cher', o)).toEqual({ type: 'descendre' });
    expect(
      alternativeResiliation('saison_creuse', { ...o, derniereOffreRetention: T - 366 * J }),
    ).toEqual({ type: 'suspendre', mois: 2 });
  });
});
