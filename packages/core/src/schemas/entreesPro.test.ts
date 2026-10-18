import { describe, expect, it } from 'vitest';
import { entreeModifierFiche } from './entreesPro';

describe('entreeModifierFiche', () => {
  it('accepte une section seule, et la chaîne vide pour retirer un champ', () => {
    expect(entreeModifierFiche.safeParse({ pitch: 'Couvreur depuis 20 ans' }).success).toBe(true);
    expect(entreeModifierFiche.safeParse({ siteWeb: '' }).success).toBe(true);
    expect(entreeModifierFiche.safeParse({ telephonePublic: '06 12 34 56 78' }).success).toBe(true);
  });

  it('refuse un envoi vide, un site non http, un devis inversé, un rayon hors 10–100 km', () => {
    expect(entreeModifierFiche.safeParse({}).success).toBe(false);
    expect(entreeModifierFiche.safeParse({ siteWeb: 'javascript:alert(1)' }).success).toBe(false);
    expect(
      entreeModifierFiche.safeParse({ devis: { minEuros: 5000, maxEuros: 1000 } }).success,
    ).toBe(false);
    expect(
      entreeModifierFiche.safeParse({
        zone: { centre: { latitude: 44.8, longitude: -0.6 }, rayonKm: 150 },
      }).success,
    ).toBe(false);
  });
});
