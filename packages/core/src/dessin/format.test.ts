import { describe, expect, it } from 'vitest';
import { lireMesure } from './format';

describe('saisie d’une mesure', () => {
  it('centimètres et mètres, virgule ou point, arrondis au millimètre ou au centimètre', () => {
    expect(lireMesure('12,5', 'cm')).toBe(125);
    expect(lireMesure(' 1 060 ', 'cm')).toBe(10_600);
    expect(lireMesure('2,754', 'm')).toBe(2_750);
    expect(lireMesure('0', 'cm')).toBe(0);
  });
  it('champ vide, illisible ou négatif : rien (jamais 0 par erreur)', () => {
    for (const s of ['', '   ', 'abc', '-3', '1,2,3']) expect(lireMesure(s, 'cm')).toBeNull();
  });
});
