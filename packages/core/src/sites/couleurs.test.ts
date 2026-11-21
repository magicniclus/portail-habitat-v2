import { describe, expect, it } from 'vitest';
import { estFonce, luminance, resoudreCouleur, rvb, texteSur } from './couleurs';

const P = { primaire: '#1d4f73', accent: '#c97a2b', clair: '#f2ede4', sombre: '#14222e' } as const;

describe('couleurs du site', () => {
  it('résout les jetons du thème', () => {
    expect(resoudreCouleur('primaire', P)).toBe('#1d4f73');
    expect(resoudreCouleur('blanc', P)).toBe('white');
    expect(resoudreCouleur('aucun', P)).toBe('transparent');
    expect(resoudreCouleur('auto', P)).toBeNull();
    expect(resoudreCouleur('rgb(1, 2, 3)', P)).toBe('rgb(1, 2, 3)');
    // Palette encore en jetons (site de démonstration) : pas de boucle infinie.
    const jetons = {
      primaire: 'primaire',
      accent: 'accent',
      clair: 'clair',
      sombre: 'sombre',
    } as const;
    expect(resoudreCouleur('primaire', jetons)).toBeNull();
  });

  it('lit hexadécimal, rgb() et hsl()', () => {
    expect(rvb('#fff')).toEqual([255, 255, 255]);
    expect(rvb('#1d4f73')).toEqual([29, 79, 115]);
    expect(rvb('rgb(29, 79, 115)')).toEqual([29, 79, 115]);
    expect(rvb('rgba(29 79 115 / 50%)')).toEqual([29, 79, 115]);
    expect(rvb('hsl(0, 100%, 50%)')!.map(Math.round)).toEqual([255, 0, 0]);
    expect(rvb('rgb(10%, 0, x)')).toBeNull();
    expect(rvb('hsl(x, 1, 1)')).toBeNull();
    expect(rvb('bleu')).toBeNull();
  });

  it('fond foncé → texte blanc ; fond clair → texte sombre', () => {
    expect(estFonce('#14222e')).toBe(true);
    expect(estFonce('#f2ede4')).toBe(false);
    expect(estFonce(null)).toBe(false);
    expect(luminance('transparent')).toBe(1);
    expect(rvb('white')).toEqual([255, 255, 255]);
    expect(texteSur('#1d4f73')).toBe('blanc');
    expect(texteSur('white')).toBe('sombre');
  });
});
