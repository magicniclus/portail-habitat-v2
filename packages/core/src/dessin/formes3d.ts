import type { SymboleObjet } from './catalogue';

/**
 * Volumes simples et reconnaissables des meubles en 3D (DES-33, D88 en attendant les modèles) :
 * quelques boîtes et cylindres dans le repère de l'objet. x le long de la largeur l, y en
 * profondeur (dos à y = -p/2), z vers le haut depuis le dessous de l'objet.
 */
export type Teinte = 'principal' | 'clair' | 'sombre' | 'verre' | 'metal' | 'textile';

export interface Primitive {
  forme: 'boite' | 'cylindre';
  centre: { x: number; y: number; z: number };
  /** Boîte : l × p × h ; cylindre : diamètre l (et p), hauteur h. */
  taille: { l: number; p: number; h: number };
  teinte: Teinte;
}

const boite = (
  x: number,
  y: number,
  z: number,
  l: number,
  p: number,
  h: number,
  teinte: Teinte = 'principal',
): Primitive => ({
  forme: 'boite',
  centre: { x, y, z: z + h / 2 },
  taille: { l, p, h },
  teinte,
});
const cylindre = (
  x: number,
  y: number,
  z: number,
  d: number,
  h: number,
  teinte: Teinte,
): Primitive => ({
  forme: 'cylindre',
  centre: { x, y, z: z + h / 2 },
  taille: { l: d, p: d, h },
  teinte,
});

/** Quatre pieds aux coins, en retrait de `r`. */
const pieds = (l: number, p: number, h: number, r = 40, d = 40) =>
  [-1, 1].flatMap((i) =>
    [-1, 1].map((j) =>
      boite((i * (l - d)) / 2 - i * r, (j * (p - d)) / 2 - j * r, 0, d, d, h, 'sombre'),
    ),
  );

export function formeObjet3D(
  symbole: SymboleObjet,
  d: { l: number; p: number; h: number },
): Primitive[] {
  const { l, p, h } = d;
  switch (symbole) {
    case 'lit': {
      const matelas = Math.min(250, h * 0.5);
      return [
        boite(0, 0, 0, l, p, h - matelas, 'principal'),
        boite(0, 30, h - matelas, l - 40, p - 100, matelas, 'clair'),
        boite(0, -p / 2 + 40, 0, l, 80, Math.max(h + 450, 900), 'principal'),
        boite(0, -p / 2 + 300, h, l - 200, 350, 120, 'textile'),
      ];
    }
    case 'canape': {
      const assise = h * 0.5;
      return [
        boite(0, 0, 0, l, p, assise, 'textile'),
        boite(0, -p / 2 + 100, 0, l, 200, h, 'textile'),
        boite(-l / 2 + 100, 0, 0, 200, p, h * 0.7, 'textile'),
        boite(l / 2 - 100, 0, 0, 200, p, h * 0.7, 'textile'),
      ];
    }
    case 'table':
      return [boite(0, 0, h - 40, l, p, 40), ...pieds(l, p, h - 40)];
    case 'table_ronde':
      return [cylindre(0, 0, h - 40, l, 40, 'principal'), cylindre(0, 0, 0, 80, h - 40, 'sombre')];
    case 'chaise':
      return [
        boite(0, 0, 430, l, p, 40),
        boite(0, -p / 2 + 20, 470, l, 40, h - 470),
        ...pieds(l, p, 430, 10, 30),
      ];
    case 'meuble_bas':
    case 'lave_vaisselle':
      return [
        boite(0, 10, 0, l, p - 20, 100, 'sombre'),
        boite(0, 0, 100, l, p, h - 140),
        boite(0, 15, h - 40, l, p + 30, 40, 'clair'),
      ];
    case 'evier':
      return [
        boite(0, 0, 0, l, p, h - 40),
        boite(0, 15, h - 40, l, p + 30, 40, 'clair'),
        boite(-l * 0.15, 30, h - 30, l * 0.45, p * 0.6, 30, 'metal'),
      ];
    case 'plaque':
      return [
        boite(0, 0, 0, l, p, h - 40),
        boite(0, 15, h - 40, l, p + 30, 40, 'clair'),
        boite(0, 30, h, l * 0.85, p * 0.8, 8, 'verre'),
      ];
    case 'meuble_haut':
    case 'hotte':
      return [boite(0, 0, 0, l, p, h, symbole === 'hotte' ? 'metal' : 'principal')];
    case 'colonne':
    case 'armoire':
    case 'frigo':
      return [
        boite(0, 0, 0, l, p, h, symbole === 'frigo' ? 'metal' : 'principal'),
        boite(0, p / 2, h * 0.45, 20, 10, 300, 'metal'),
      ];
    case 'baignoire':
      return [boite(0, 0, 0, l, p, h), boite(0, 0, h - 5, l - 120, p - 120, 10, 'clair')];
    case 'douche':
      return [boite(0, 0, 0, l, p, 60, 'clair'), boite(0, p / 2 - 5, 60, l, 10, 1_950, 'verre')];
    case 'vasque':
      return [
        boite(0, 0, 0, l, p, h - 60),
        cylindre(0, 30, h - 60, Math.min(l, p) * 0.7, 120, 'clair'),
      ];
    case 'wc':
      return [
        boite(0, -p / 2 + 90, 0, l, 180, h + 400, 'clair'),
        cylindre(0, p * 0.1, 0, Math.min(l, p * 0.7), h, 'clair'),
      ];
    case 'rond':
    case 'plante':
      return [cylindre(0, 0, 0, Math.min(l, p), h, symbole === 'plante' ? 'textile' : 'principal')];
    case 'point_lumineux':
      return [cylindre(0, 0, 0, Math.min(l, p), Math.max(h, 30), 'clair')];
    case 'tapis':
      return [boite(0, 0, 0, l, p, Math.max(h, 10), 'textile')];
    default:
      return [boite(0, 0, 0, l, p, Math.max(h, 10))];
  }
}
