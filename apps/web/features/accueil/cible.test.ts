import { describe, expect, it } from 'vitest';
import { cibleProjet } from './cible';

describe('formulaire du hero (ACC-03)', () => {
  it('chip choisi : prestation et code postal préremplis', () => {
    expect(
      cibleProjet({ projet: 'Salle de bain', cp: '33000', delai: 'asap', prestation: 'sdb' }),
    ).toBe('/simulateur?prestation=sdb&cp=33000&delai=asap');
  });
  it('libellé populaire tapé à la main : même résultat', () => {
    expect(cibleProjet({ projet: ' electricite ', cp: '33000', delai: '1mois' })).toBe(
      '/simulateur?prestation=elec&cp=33000&delai=1mois',
    );
  });
  it('texte libre : transmis au simulateur ; code postal invalide ignoré', () => {
    expect(cibleProjet({ projet: 'Abri de jardin', cp: '330', delai: '' })).toBe(
      '/simulateur?projet=Abri+de+jardin',
    );
    expect(cibleProjet({ projet: '', cp: '', delai: '' })).toBe('/simulateur');
  });
});
