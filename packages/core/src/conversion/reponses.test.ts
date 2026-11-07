import { describe, expect, it } from 'vitest';
import { adresseExpediteur } from './reponses';

describe('réponses aux emails de conversion (CONVERSION §9, cycleOnReponseEmail)', () => {
  it('adresse extraite de l’en-tête From, en minuscules', () => {
    expect(adresseExpediteur('Marc Dupont <Marc@Exemple.fr>')).toBe('marc@exemple.fr');
    expect(adresseExpediteur(' marc@exemple.fr ')).toBe('marc@exemple.fr');
    expect(adresseExpediteur('Marc Dupont')).toBeNull();
    expect(adresseExpediteur('<pas une adresse>')).toBeNull();
  });
});
