import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { genererThemeTailwind, genererThemesCss } from './css';
import { THEMES, actions, couleurs, neutres, rampes } from './index';

const lire = (f: string) => readFileSync(resolve(__dirname, '../styles', f), 'utf8');

/** Luminance relative WCAG. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

describe('tokens', () => {
  it('les CSS générés sont à jour (sinon : pnpm --filter @ph/ui tokens)', () => {
    expect(lire('themes.css')).toBe(genererThemesCss());
    expect(lire('theme.css')).toBe(genererThemeTailwind());
  });

  it('chaque thème a une rampe complète', () => {
    for (const t of THEMES) {
      for (const p of [100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
        expect(rampes[t][p]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('contraste AA : texte blanc sur le fond « action » de chaque espace (boutons principaux)', () => {
    for (const t of THEMES)
      expect(contraste(couleurs.blanc, actions[t])).toBeGreaterThanOrEqual(4.5);
  });

  it('contraste AA : liens (accent 700) et texte secondaire (neutre 700) sur blanc', () => {
    for (const t of THEMES)
      expect(contraste(rampes[t][700], couleurs.fond)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(neutres[700], couleurs.fond)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(couleurs.texte, couleurs.fond)).toBeGreaterThanOrEqual(7);
  });

  it('contraste AA : badges de statut (texte sur fond teinté)', () => {
    const paires = [
      [couleurs.succes, couleurs.succesFond],
      [couleurs.attention, couleurs.attentionFond],
      [couleurs.danger, couleurs.dangerFond],
      [couleurs.info, couleurs.infoFond],
      [couleurs.premiumTexte, couleurs.premiumFond],
    ] as const;
    for (const [fg, bg] of paires) expect(contraste(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
