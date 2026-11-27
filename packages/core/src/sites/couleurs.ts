import type { Couleur, Theme } from './schemas';

/**
 * Couleurs du site (maquette Editeur de Site) : jetons du thème résolus, luminance pour choisir
 * automatiquement un texte clair ou foncé sur un fond (boutons, zones, blocs).
 */
export type Palette = Theme['palette'];

/** Valeur CSS d'une couleur ; `aucun` → transparent, `auto` → null (hérite). */
export function resoudreCouleur(c: Couleur, p: Palette): string | null {
  if (c === 'aucun') return 'transparent';
  if (c === 'auto') return null;
  if (c === 'blanc') return 'white';
  if (c === 'primaire' || c === 'accent' || c === 'clair' || c === 'sombre') {
    const v = p[c];
    return v === c ? null : resoudreCouleur(v, p);
  }
  return c;
}

const hsl = (h: number, s: number, l: number): [number, number, number] => {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};

/** Composantes RVB (0-255) d'une couleur `#hex`, `rgb()` ou `hsl()` ; `null` si illisible. */
export function rvb(css: string): [number, number, number] | null {
  const c = css.trim().toLowerCase();
  if (c === 'white') return [255, 255, 255];
  const h = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (h) {
    const x = h[1]!.length === 3 ? [...h[1]!].map((d) => d + d).join('') : h[1]!;
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as [number, number, number];
  }
  const n = c.match(/^(rgb|hsl)a?\(([^)]*)\)$/);
  if (!n) return null;
  const v = n[2]!.split(/[\s,/]+/).filter(Boolean);
  const num = (s: string | undefined, max: number) =>
    s?.endsWith('%') ? (parseFloat(s) / 100) * max : parseFloat(s ?? '');
  if (n[1] === 'rgb') {
    const r = [num(v[0], 255), num(v[1], 255), num(v[2], 255)];
    return r.some(Number.isNaN) ? null : (r as [number, number, number]);
  }
  const [hh, s, l] = [parseFloat(v[0] ?? ''), num(v[1], 1), num(v[2], 1)];
  return [hh, s, l].some(Number.isNaN) ? null : hsl(hh, s, l);
}

/** Luminance perçue (0 noir, 1 blanc) ; 1 si la couleur est illisible ou transparente. */
export function luminance(css: string | null): number {
  const c = css ? rvb(css) : null;
  return c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 : 1;
}

/** Fond foncé : le texte posé dessus passe en blanc. */
export const estFonce = (css: string | null) => luminance(css) < 0.55;

/** Texte lisible sur un fond plein (boutons, initiales) : sombre ou blanc. */
export const texteSur = (css: string | null): 'sombre' | 'blanc' =>
  luminance(css) > 0.62 ? 'sombre' : 'blanc';
