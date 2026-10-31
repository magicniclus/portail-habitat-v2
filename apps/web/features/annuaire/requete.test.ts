import { describe, expect, it } from 'vitest';
import { requeteFiltres } from './requete';

describe('requeteFiltres', () => {
  it('multi-valeurs jointes, défauts omis, même ordre que ecrireFiltresAnnuaire', () => {
    const f = new FormData();
    f.append('metier', 'plombier');
    f.append('metier', 'carreleur');
    f.append('rayon', '20');
    f.append('note', '4.5');
    f.append('tri', 'pertinence');
    f.append('q', ' douche ');
    expect(requeteFiltres(f)).toBe('?q=douche&metier=plombier%2Ccarreleur&note=4.5');
    expect(requeteFiltres(new FormData())).toBe('');
  });
});
