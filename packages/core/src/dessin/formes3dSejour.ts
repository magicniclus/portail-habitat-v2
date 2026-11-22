import type { SymboleObjet } from './catalogue';
import { canape } from './formes3dCanape';
import type { Dimensions, Primitive } from './formes3dOutils';

/**
 * Séjour au dessin simple : canapés à coussins (droit, sur pieds, d'angle, méridienne,
 * fauteuil). Les tables sont dans formes3dTables.ts. Le tissu suit la couleur choisie (teinte
 * `principal` pour la structure, `textile` pour les coussins).
 */

export function formeSejour(
  symbole: SymboleObjet,
  d: Dimensions,
  style?: string,
): Primitive[] | null {
  const { l, p, h } = d;
  if (symbole === 'canape') return canape(l, p, h, style);
  return null;
}
