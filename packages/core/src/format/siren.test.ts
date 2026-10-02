import { describe, expect, it } from 'vitest';
import {
  estSirenValide,
  estSiretValide,
  formatSiren,
  formatSiret,
  normaliserSiren,
  sirenDeSiret,
} from './siren';

describe('SIREN', () => {
  it('normalise la saisie', () => {
    expect(normaliserSiren(' 732 829 320 ')).toBe('732829320');
    expect(normaliserSiren('732.829.320')).toBe('732829320');
  });
  it.each(['732829320', '443 061 841', '552100554'])('accepte %s', (s) => {
    expect(estSirenValide(s)).toBe(true);
  });
  it.each(['123456789', '73282932', '7328293201', 'abcdefghi', ''])('refuse %s', (s) => {
    expect(estSirenValide(s)).toBe(false);
  });
  it('formate par groupes de 3', () => {
    expect(formatSiren('732829320')).toBe('732 829 320');
    expect(formatSiren('bidon')).toBe('bidon');
  });
});

describe('SIRET', () => {
  it.each(['73282932000074', '443 061 841 00047'])('accepte %s', (s) => {
    expect(estSiretValide(s)).toBe(true);
  });
  it('applique l’exception La Poste (SIREN 356000000, somme des chiffres multiple de 5)', () => {
    expect(estSiretValide('35600000049837')).toBe(true);
    expect(estSiretValide('35600000049838')).toBe(false);
  });
  it.each(['73282932000075', '7328293200007', '12345678901234', ''])('refuse %s', (s) => {
    expect(estSiretValide(s)).toBe(false);
  });
  it('formate et extrait le SIREN', () => {
    expect(formatSiret('73282932000074')).toBe('732 829 320 00074');
    expect(formatSiret('bidon')).toBe('bidon');
    expect(sirenDeSiret('732 829 320 00074')).toBe('732829320');
  });
});
