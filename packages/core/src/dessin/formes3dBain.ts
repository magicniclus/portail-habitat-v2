import type { SymboleObjet } from './catalogue';
import { boite, cylindre, facade, type Dimensions, type Primitive } from './formes3dOutils';

/**
 * Salle de bain au dessin simple. Variantes par `style` : baignoires droite / îlot / d'angle /
 * avec pare-bain, douches italienne / grande / d'angle / en niche / cabine, WC suspendu / au
 * sol / avec lave-mains, meubles vasque encastrée / à poser / suspendu.
 */

/** Colonne de douche contre le mur du fond : barre, pommeau, mitigeur. */
const colonne = (x: number, p: number, haut: number) => [
  boite(x, -p / 2 + 30, 900, 25, 25, haut - 900, 'metal'),
  boite(x, -p / 2 + 150, haut - 25, 30, 250, 25, 'metal'),
  cylindre(x, -p / 2 + 280, haut - 35, 250, 12, 'metal'),
  boite(x, -p / 2 + 40, 1_050, 160, 40, 60, 'metal'),
];

/** Paroi vitrée le long de x (devant) ou de y (côté). */
const vitreDevant = (x: number, l: number, p: number, z: number, haut: number) =>
  boite(x, p / 2 - 10, z, l, 10, haut, 'verre');
const vitreCote = (x: number, p: number, z: number, haut: number, longueur = p) =>
  boite(x, -p / 2 + longueur / 2, z, 10, longueur, haut, 'verre');

function baignoire(l: number, p: number, h: number, style?: string): Primitive[] {
  if (style === 'ilot') {
    // Baignoire îlot : forme de stade, bords arrondis, robinetterie sur pied.
    const r = p / 2;
    return [
      boite(0, 0, 0, l - p, p, h, 'clair'),
      cylindre(-l / 2 + r, 0, 0, p, h, 'clair'),
      cylindre(l / 2 - r, 0, 0, p, h, 'clair'),
      boite(0, 0, h - 40, l - p, p - 120, 45, 'verre'),
      cylindre(-l / 2 + r, 0, h - 40, p - 120, 45, 'verre'),
      cylindre(l / 2 - r, 0, h - 40, p - 120, 45, 'verre'),
    ];
  }
  if (style === 'angle') {
    const m = Math.min(l, p);
    return [
      boite(0, 0, 0, l, p, h, 'clair'),
      cylindre(-l / 2 + m * 0.42, -p / 2 + m * 0.42, h - 40, m * 0.75, 45, 'verre'),
      boite(l / 2 - 120, -p / 2 + 90, h, 40, 40, 160, 'metal'),
    ];
  }
  return [
    boite(0, 0, 0, l, p, h, 'clair'),
    boite(0, 0, h - 40, l - 120, p - 120, 45, 'verre'),
    boite(-l / 2 + 120, -p / 2 + 50, h, 40, 40, 180, 'metal'),
    ...(style === 'douche'
      ? [
          boite(-l / 2 + 450, p / 2 - 30, h, 900, 10, 1_400, 'verre'),
          ...colonne(-l / 2 + 200, p, h + 1_500),
        ]
      : []),
  ];
}

function douche(l: number, p: number, style?: string): Primitive[] {
  const receveur = style === 'italienne' || style === 'grande' ? 20 : 60;
  const haut = 2_000;
  const parois: Primitive[] =
    style === 'angle' || style === 'cabine'
      ? [
          vitreDevant(0, l, p, receveur, haut - receveur),
          vitreCote(l / 2 - 5, p, receveur, haut - receveur),
          ...(style === 'cabine' ? [vitreCote(-l / 2 + 5, p, receveur, haut - receveur)] : []),
        ]
      : style === 'niche'
        ? [
            vitreDevant(-l / 4 + 20, l / 2, p, receveur, haut - receveur),
            boite(l / 4 - 20, p / 2 - 30, receveur, l / 2, 10, haut - receveur, 'verre'),
            boite(0, p / 2 - 20, haut - 40, l, 40, 40, 'metal'),
          ]
        : [
            vitreCote(
              l / 2 - 5,
              p,
              receveur,
              haut - receveur,
              Math.min(p, style === 'grande' ? 1_200 : 900),
            ),
          ];
  return [
    boite(0, 0, 0, l, p, receveur, 'clair'),
    boite(l / 4, 0, receveur, 120, 120, 4, 'sombre'),
    ...parois,
    ...colonne(-l / 4, p, haut),
  ];
}

function wc(l: number, p: number, h: number, style?: string): Primitive[] {
  const bati = style === 'sol' ? 180 : 140;
  const cuvette = [
    boite(
      0,
      -p / 2 + (p - bati) / 2 + bati,
      style === 'sol' ? 0 : 180,
      l * 0.85,
      p - bati,
      style === 'sol' ? h : h - 180,
      'clair',
    ),
    boite(0, -p / 2 + bati + (p - bati) / 2, h, l * 0.9, p - bati - 20, 25, 'clair'),
  ];
  const arriere =
    style === 'sol'
      ? [boite(0, -p / 2 + bati / 2, h - 50, l, bati, 400, 'clair')]
      : [
          boite(0, -p / 2 + bati / 2, 0, l, bati, 1_100, 'principal'),
          boite(0, -p / 2 + bati + 2, 950, 220, 4, 140, 'clair'),
        ];
  const laveMains =
    style === 'lave-mains'
      ? [
          boite(0, -p / 2 + (bati + 120) / 2, 1_100, l, bati + 120, 30, 'clair'),
          cylindre(0, -p / 2 + bati / 2 + 30, 1_130, 220, 60, 'clair'),
        ]
      : [];
  return [...cuvette, ...arriere, ...laveMains];
}

function vasque(l: number, p: number, h: number, style?: string): Primitive[] {
  const plan = 40;
  const bas = style === 'suspendue' ? 350 : 0;
  const nb = l >= 1_100 ? 2 : 1;
  const xs = nb === 2 ? [-l / 4, l / 4] : [0];
  const poser = style === 'poser';
  return [
    boite(0, 0, bas, l, p, h - plan - bas),
    ...facade(l, p, bas, h - plan - bas, 450),
    boite(0, 10, h - plan, l, p + 20, plan, 'plan'),
    ...xs.flatMap((x) => [
      poser
        ? cylindre(x, 40, h, Math.min(450, p * 0.85), 140, 'clair')
        : boite(x, 40, h - 10, Math.min(500, l / nb - 120), p * 0.6, 12, 'clair'),
      cylindre(x, -p / 2 + 60, h, 40, poser ? 300 : 200, 'metal'),
      boite(x, -p / 2 + 110, h + (poser ? 270 : 170), 30, 120, 30, 'metal'),
    ]),
  ];
}

export function formeBain(
  symbole: SymboleObjet,
  d: Dimensions,
  style?: string,
): Primitive[] | null {
  const { l, p, h } = d;
  switch (symbole) {
    case 'baignoire':
      return baignoire(l, p, h, style);
    case 'douche':
      return douche(l, p, style);
    case 'wc':
      return wc(l, p, h, style);
    case 'vasque':
      return vasque(l, p, h, style);
    default:
      return null;
  }
}
