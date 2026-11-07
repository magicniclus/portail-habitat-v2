import { describe, expect, it } from 'vitest';
import { texteAdresse } from './adresse';

describe('adresse de livraison / du chantier', () => {
  it('une ligne imprimable, parties vides ignorées', () => {
    expect(
      texteAdresse({
        attention: 'M. Durand',
        adresse: '3 rue des Lilas',
        codePostal: '33700',
        ville: 'Mérignac',
        pays: '',
      }),
    ).toBe('À l’attention de M. Durand, 3 rue des Lilas, 33700 Mérignac');
    expect(texteAdresse({ adresse: ' ', ville: 'Bordeaux', pays: 'France' })).toBe(
      'Bordeaux, France',
    );
    expect(texteAdresse({})).toBe('');
  });
});
