import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { genererAmbianceCss, genererThemeTailwind, genererThemesCss } from './css';
import { THEMES, actions, couleurs, neutres, palettesSites, rampes } from './index';

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
    expect(lire('ambiance.css')).toBe(genererAmbianceCss());
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

  it('palettes des sites artisans : texte blanc lisible sur la principale, accent visible, fonds clairs', () => {
    for (const p of palettesSites) {
      expect(contraste(couleurs.blanc, p.primaire)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(couleurs.blanc, p.sombre)).toBeGreaterThanOrEqual(7);
      expect(contraste(p.accent, couleurs.blanc)).toBeGreaterThanOrEqual(2.7);
      expect(contraste(p.accent, p.sombre)).toBeGreaterThanOrEqual(3);
      expect(luminance(p.clair)).toBeGreaterThan(0.85);
    }
  });

  it('palettes des sites : bleu, vert, orange ou noir, jamais rouge ni beige (décision du 17/11/2026)', () => {
    /** Teinte (0-360) et saturation d'une couleur. */
    const teinte = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
        number,
        number,
        number,
      ];
      const max = Math.max(r, g, b);
      const d = max - Math.min(r, g, b);
      const sat = max === 0 ? 0 : d / max;
      if (d === 0) return { h: 0, sat };
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: (h * 60 + 360) % 360, sat };
    };
    const familles = (h: number) =>
      (h >= 15 && h <= 45) || (h >= 90 && h <= 170) || (h >= 190 && h <= 240);
    for (const p of palettesSites)
      for (const c of [p.primaire, p.accent, p.clair, p.sombre]) {
        const { h, sat } = teinte(c);
        // Neutre (noir, gris) ou dans une famille autorisée ; un fond clair chaud est du beige.
        if (sat > 0.12) expect(familles(h), `${p.nom} ${c}`).toBe(true);
        if (c === p.clair && sat > 0.04) expect(h > 45, `${p.nom} fond clair ${c}`).toBe(true);
      }
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
