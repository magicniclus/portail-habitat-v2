import { describe, expect, it } from 'vitest';
import {
  annuler,
  creerHistorique,
  enregistrer,
  peutAnnuler,
  peutRetablir,
  retablir,
  terminerGeste,
} from './historique';

describe('historique de Dessin', () => {
  it('annule et rétablit', () => {
    let h = enregistrer(enregistrer(creerHistorique(0), 1), 2);
    expect(peutRetablir(h)).toBe(false);
    h = annuler(h);
    expect(h.present).toBe(1);
    h = retablir(h);
    expect(h.present).toBe(2);
    expect(annuler(annuler(annuler(h))).present).toBe(0);
    expect(annuler(creerHistorique(0)).present).toBe(0);
    expect(retablir(h)).toBe(h);
  });

  it('une modification efface le futur', () => {
    const h = enregistrer(annuler(enregistrer(creerHistorique('a'), 'b')), 'c');
    expect(peutRetablir(h)).toBe(false);
    expect(h.passe).toEqual(['a']);
  });

  it('un glisser ne fait qu’une étape', () => {
    let h = creerHistorique(0);
    for (const x of [1, 2, 3, 4]) h = enregistrer(h, x, 'glisser-m1');
    h = terminerGeste(h);
    expect(terminerGeste(h)).toBe(h);
    h = enregistrer(h, 5, 'glisser-m1');
    expect(h.passe).toEqual([0, 4]);
    expect(annuler(h).present).toBe(4);
  });

  it('est borné', () => {
    let h = creerHistorique(0);
    for (let i = 1; i <= 10; i++) h = enregistrer(h, i, null, 3);
    expect(h.passe).toEqual([7, 8, 9]);
    expect(peutAnnuler(h)).toBe(true);
    expect(peutAnnuler(creerHistorique(0))).toBe(false);
  });
});
