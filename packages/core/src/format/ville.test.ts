import { describe, expect, it } from 'vitest';
import { casseVille } from './ville';

describe('casseVille (noms de communes du SIRET en capitales)', () => {
  it('capitales → casse usuelle, petits mots en minuscules sauf en tête', () => {
    expect(casseVille('CARIGNAN-DE-BORDEAUX')).toBe('Carignan-de-Bordeaux');
    expect(casseVille('LA TESTE-DE-BUCH')).toBe('La Teste-de-Buch');
    expect(casseVille("SAINT-MEDARD-D'EYRANS")).toBe("Saint-Medard-d'Eyrans");
    expect(casseVille('LE BOUSCAT')).toBe('Le Bouscat');
    expect(casseVille('BORDEAUX')).toBe('Bordeaux');
  });

  it('déjà en casse usuelle : inchangé', () => {
    expect(casseVille('Mérignac')).toBe('Mérignac');
    expect(casseVille('Saint-Médard-en-Jalles')).toBe('Saint-Médard-en-Jalles');
    expect(casseVille('')).toBe('');
  });
});
