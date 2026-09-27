import { describe, expect, it } from 'vitest';
import { estMobileFr, formatTel, normaliserTel } from './telephone';

describe('normaliserTel', () => {
  it.each([
    ['06 12 34 56 78', '+33612345678'],
    ['0612345678', '+33612345678'],
    ['06.12.34.56.78', '+33612345678'],
    ['06-12-34-56-78', '+33612345678'],
    ['+33 6 12 34 56 78', '+33612345678'],
    ['+33 (0)6 12 34 56 78', '+33612345678'],
    ['0033612345678', '+33612345678'],
    ['05 56 00 00 00', '+33556000000'],
    ['+32 470 12 34 56', '+32470123456'],
  ])('« %s » → %s', (saisie, attendu) => {
    expect(normaliserTel(saisie)).toBe(attendu);
  });
  it.each([
    '',
    '06 12',
    '00 12 34 56 78',
    '+33 0 12 34 56 78',
    'abc',
    '+0123456789',
    '061234567890',
  ])('refuse « %s »', (saisie) => {
    expect(normaliserTel(saisie)).toBeNull();
  });
});

describe('formatTel', () => {
  it('affiche un numéro français par paires', () => {
    expect(formatTel('+33612345678')).toBe('06 12 34 56 78');
    expect(formatTel('+33556000000')).toBe('05 56 00 00 00');
  });
  it('laisse les numéros étrangers ou invalides tels quels', () => {
    expect(formatTel('+32470123456')).toBe('+32470123456');
    expect(formatTel('n’importe quoi')).toBe('n’importe quoi');
  });
});

describe('estMobileFr', () => {
  it('reconnaît les 06 et 07', () => {
    expect(estMobileFr('+33612345678')).toBe(true);
    expect(estMobileFr('+33712345678')).toBe(true);
    expect(estMobileFr('+33556000000')).toBe(false);
    expect(estMobileFr('+32470123456')).toBe(false);
  });
});
