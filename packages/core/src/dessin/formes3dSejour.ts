import type { SymboleObjet } from './catalogue';
import { canape } from './formes3dCanape';
import { boite, pieds, type Dimensions, type Primitive } from './formes3dOutils';

/**
 * Séjour au dessin simple : canapés à coussins (droit, sur pieds, d'angle, méridienne,
 * fauteuil) et tables basses (à étagère, bloc). Le tissu suit la couleur choisie (teinte
 * `principal` pour la structure, `textile` pour les coussins).
 */

function tableBasse(l: number, p: number, h: number, style?: string): Primitive[] | null {
  if (style === 'etagere')
    return [
      boite(0, 0, h - 40, l, p, 40),
      boite(0, 0, 120, l - 80, p - 80, 25),
      ...pieds(l, p, h - 40, 20, 45, 'principal'),
    ];
  if (style === 'bloc')
    return [boite(0, 0, 0, l - 60, p - 60, h - 40, 'sombre'), boite(0, 0, h - 40, l, p, 40)];
  return null;
}

export function formeSejour(
  symbole: SymboleObjet,
  d: Dimensions,
  style?: string,
): Primitive[] | null {
  const { l, p, h } = d;
  if (symbole === 'canape') return canape(l, p, h, style);
  if (symbole === 'table') return tableBasse(l, p, h, style);
  return null;
}
