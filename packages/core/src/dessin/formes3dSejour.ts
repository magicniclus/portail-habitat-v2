import type { SymboleObjet } from './catalogue';
import { boite, pieds, repartir, type Dimensions, type Primitive } from './formes3dOutils';

/**
 * Séjour au dessin simple : canapés à coussins (droit, sur pieds, d'angle, méridienne,
 * fauteuil) et tables basses (à étagère, bloc). Le tissu suit la couleur choisie (teinte
 * `principal` pour la structure, `textile` pour les coussins).
 */

/** Coussins d'assise et de dossier sur une longueur `l`, à partir de x0, profondeur `p`. */
function coussins(x0: number, y0: number, l: number, p: number, z: number, hDos: number) {
  const n = Math.max(1, Math.round(l / 750));
  const largeur = l / n;
  return repartir(l, n, largeur / 2).flatMap((x) => [
    boite(x0 + x, y0 + 80, z, largeur - 20, p - 180, 140, 'textile'),
    boite(x0 + x, y0 - p / 2 + 110, z + 140, largeur - 30, 180, hDos, 'textile'),
  ]);
}

function canape(l: number, p: number, h: number, style?: string): Primitive[] {
  const surPieds = style === 'pieds' || style === 'fauteuil';
  const bas = surPieds ? 160 : 0;
  const assise = Math.round(h * 0.5) - bas - 140;
  const accoudoir = surPieds ? 110 : 200;
  const hDos = h - bas - assise - 140;
  const base = surPieds
    ? pieds(l, p, bas, 60, 40)
    : [boite(0, 10, 0, l - 40, p - 40, 60, 'sombre')];
  if (style === 'angle') {
    const prof = Math.min(1_000, p / 2);
    const retour = p - prof;
    return [
      boite(0, -p / 2 + prof / 2, 0, l, prof, assise + bas),
      boite(l / 2 - prof / 2, p / 2 - retour / 2, 0, prof, retour, assise + bas),
      boite(0, -p / 2 + 80, 0, l, 160, h * 0.9),
      boite(-l / 2 + accoudoir / 2, -p / 2 + prof / 2, 0, accoudoir, prof, h * 0.65),
      ...coussins(-accoudoir / 2, -p / 2 + prof / 2, l - accoudoir, prof, assise + bas, hDos),
      boite(
        l / 2 - prof / 2,
        p / 2 - retour / 2 + 40,
        assise + bas,
        prof - 60,
        retour - 120,
        140,
        'textile',
      ),
    ];
  }
  const gauche = boite(-l / 2 + accoudoir / 2, 0, bas, accoudoir, p, h * 0.65 - bas);
  const droite = boite(l / 2 - accoudoir / 2, 0, bas, accoudoir, p, h * 0.65 - bas);
  const meridienne = style === 'meridienne';
  const utile = l - accoudoir * (meridienne ? 1 : 2);
  const x0 = meridienne ? accoudoir / 2 : 0;
  return [
    ...base,
    boite(0, 0, bas, l, p, assise),
    meridienne
      ? boite(-l / 4, -p / 2 + 80, bas, l / 2, 160, h * 0.85 - bas)
      : boite(0, -p / 2 + 80, bas, l, 160, h * 0.85 - bas),
    gauche,
    ...(meridienne ? [] : [droite]),
    ...(meridienne
      ? [boite(x0, 40, bas + assise, utile - 20, p - 100, 140, 'textile')]
      : coussins(0, 0, utile, p, bas + assise, hDos)),
  ];
}

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
