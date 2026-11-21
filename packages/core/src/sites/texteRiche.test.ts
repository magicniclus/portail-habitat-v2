import { describe, expect, it } from 'vitest';
import { blocsTexte, texteSansFormat } from './texteRiche';

describe('texte riche des sites', () => {
  it('sans format : balises, puces et numéros retirés, mots liés gardés', () => {
    expect(
      texteSansFormat(
        '<b>Devis</b> <mark>gratuit</mark> <ka>vite</ka>\n• [Appelez](#L1)\n2. <s>x</s>',
      ),
    ).toBe('Devis gratuit vite\nAppelez\nx');
  });

  it('blocs : paragraphes, puces et numéros consécutifs regroupés', () => {
    expect(blocsTexte('Intro\n• un\n• deux\n3. trois\n4. quatre\nFin')).toEqual([
      { type: 'texte', lignes: ['Intro'] },
      { type: 'puces', lignes: ['un', 'deux'] },
      { type: 'numeros', lignes: ['trois', 'quatre'], depart: 3 },
      { type: 'texte', lignes: ['Fin'] },
    ]);
  });
});
