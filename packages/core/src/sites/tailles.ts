import type { UniteTaille } from './schemas';

/** Bornes et pas de saisie par unité (taille d'un texte). */
export const BORNES_TAILLE: Record<UniteTaille, { min: number; max: number; pas: number }> = {
  px: { min: 8, max: 200, pas: 1 },
  em: { min: 0.5, max: 12, pas: 0.05 },
  rem: { min: 0.5, max: 12, pas: 0.05 },
  vw: { min: 0.5, max: 20, pas: 0.1 },
  '%': { min: 50, max: 800, pas: 5 },
};

/** Équivalent en px (texte de base 16 px, écran de référence 1280 px). */
const EN_PX: Record<UniteTaille, number> = { px: 1, em: 16, rem: 16, vw: 12.8, '%': 0.16 };

/** Taille convertie d'une unité à l'autre (même rendu à l'œil), arrondie au pas et bornée. */
export function convertirTaille(v: number, de: UniteTaille, vers: UniteTaille): number {
  const b = BORNES_TAILLE[vers];
  const brut = (v * EN_PX[de]) / EN_PX[vers];
  const arrondi = Math.round(brut / b.pas) * b.pas;
  return Number(Math.min(b.max, Math.max(b.min, arrondi)).toFixed(2));
}

/** Valeur saisie ramenée dans les bornes de l'unité (champ libre). */
export function bornerTaille(v: number, u: UniteTaille): number {
  const b = BORNES_TAILLE[u];
  return Number.isFinite(v) ? Number(Math.min(b.max, Math.max(b.min, v)).toFixed(2)) : b.min;
}
