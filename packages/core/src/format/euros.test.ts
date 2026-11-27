import { describe, expect, it } from 'vitest';
import { formatEuros, formatFourchette, parseEuros } from './euros';

// fr-FR : espace fine insécable (U+202F) pour les milliers, insécable (U+00A0) avant €.
const m = ' ';
const n = ' ';

describe('formatEuros', () => {
  it('affiche les euros ronds sans décimales', () => {
    expect(formatEuros(129000)).toBe(`1${m}290${n}€`);
    expect(formatEuros(0)).toBe(`0${n}€`);
  });
  it('affiche les centimes quand il y en a', () => {
    expect(formatEuros(7990)).toBe(`79,90${n}€`);
    expect(formatEuros(95880)).toBe(`958,80${n}€`);
    expect(formatEuros(5)).toBe(`0,05${n}€`);
  });
  it('gère les grands montants et les négatifs', () => {
    expect(formatEuros(123456750)).toBe(`1${m}234${m}567,50${n}€`);
    expect(formatEuros(-129000)).toBe(`-1${m}290${n}€`);
  });
  it('force ou supprime les décimales', () => {
    expect(formatEuros(129000, { decimales: 'toujours' })).toBe(`1${m}290,00${n}€`);
    expect(formatEuros(7990, { decimales: 'jamais' })).toBe(`80${n}€`);
    expect(formatEuros(7949, { decimales: 'jamais' })).toBe(`79${n}€`);
  });
  it('ajoute HT ou TTC', () => {
    expect(formatEuros(7990, { suffixe: 'HT' })).toBe(`79,90${n}€${n}HT`);
    expect(formatEuros(1290, { suffixe: 'TTC' })).toBe(`12,90${n}€${n}TTC`);
  });
  it('refuse tout ce qui n’est pas un entier de centimes', () => {
    expect(() => formatEuros(79.9)).toThrow(RangeError);
    expect(() => formatEuros(Number.NaN)).toThrow(RangeError);
    expect(() => formatEuros(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });
});

describe('parseEuros', () => {
  it.each([
    ['79,90', 7990],
    ['79.90', 7990],
    ['79,9', 7990],
    ['12', 1200],
    ['1 290', 129000],
    [`1${m}290,50 €`, 129050],
    [' 0,05 ', 5],
    ['-12,50', -1250],
    ['0,1', 10],
  ])('« %s » → %i centimes', (saisie, attendu) => {
    expect(parseEuros(saisie)).toBe(attendu);
  });
  it.each(['', 'abc', '12,345', '1,2,3', '12€34', '--1', ','])('refuse « %s »', (saisie) => {
    expect(parseEuros(saisie)).toBeNull();
  });
  it('ne passe jamais par un flottant (0,29 × 100)', () => {
    expect(parseEuros('0,29')).toBe(29);
    expect(parseEuros('1,15')).toBe(115);
  });
});

describe('formatFourchette', () => {
  it('« 110 – 190 € », un seul symbole', () => {
    expect(formatFourchette(11_000, 19_000)).toBe('110 – 190 €');
    expect(formatFourchette(51_500, 81_000)).toBe('515 – 810 €');
  });
  it('montants égaux : un seul nombre', () => {
    expect(formatFourchette(5_000, 5_000)).toBe('50 €');
  });
  it('refuse les montants non entiers ou inversés', () => {
    expect(() => formatFourchette(1.5, 3)).toThrow(RangeError);
    expect(() => formatFourchette(300, 100)).toThrow(RangeError);
  });
});
