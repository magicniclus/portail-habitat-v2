import type { SymboleObjet } from './catalogue';
import {
  boite,
  cylindre,
  douce,
  pan,
  repartir,
  type Dimensions,
  type Primitive,
} from './formes3dOutils';

/**
 * Bureaux et sièges de bureau au dessin simple et soigné : plateau à la couleur choisie
 * (teinte `principal`), piètement métal noir, bois ou panneaux. On travaille côté y > 0 ; le
 * dos (voile de fond) est côté mur, en y = -p/2.
 */
const EP = 30;
const plateau = (x: number, y: number, l: number, p: number, h: number, ep = EP) =>
  douce(x, y, h - ep, l, p, ep, 6, 'plateau');
const panneau = (x: number, p: number, h: number, e = 30) => boite(x, 0, 0, e, p - 40, h - EP);
const voile = (l: number, p: number, h: number) =>
  boite(0, -p / 2 + 100, h - EP - 380, l - 80, 18, 380);

/** Caisson à tiroirs sous le plateau, en x, largeur 420. */
function caisson(x: number, p: number, h: number): Primitive[] {
  const haut = h - EP - 10;
  return [
    boite(x, 0, 0, 420, p - 60, haut),
    ...repartir(haut, 3, haut / 6).flatMap((z, i) => [
      ...(i > 0 ? [boite(x, (p - 60) / 2 + 2, haut / 2 + z - haut / 6, 400, 4, 6, 'sombre')] : []),
      boite(x, (p - 60) / 2 + 12, haut / 2 + z + haut / 12, 160, 16, 16, 'poignee'),
    ]),
  ];
}

/** Tréteau en A : deux jambes inclinées et une traverse. */
function treteau(x: number, p: number, h: number): Primitive[] {
  const haut = h - EP;
  const ecart = p / 2 - 80;
  const dy = ecart - p * 0.12;
  const long = Math.hypot(dy, haut);
  const angle = Math.atan2(haut, dy);
  return [
    pan(x, -p * 0.06 - dy / 2, haut / 2, 45, long, 45, angle, 'bois'),
    pan(x, p * 0.06 + dy / 2, haut / 2, 45, long, 45, -angle, 'bois'),
    boite(x, 0, haut * 0.45, 40, p * 0.5, 40, 'bois'),
  ];
}

/** Pieds métal fins aux coins, et ceinture sous le plateau. */
const cadreMetal = (l: number, p: number, h: number) => [
  ...[-1, 1].flatMap((i) =>
    [-1, 1].map((j) => boite(i * (l / 2 - 40), j * (p / 2 - 40), 0, 30, 30, h - EP, 'sombre')),
  ),
  boite(0, -p / 2 + 40, h - EP - 50, l - 80, 25, 50, 'sombre'),
  boite(0, p / 2 - 40, h - EP - 50, l - 80, 25, 50, 'sombre'),
];

function bureau(l: number, p: number, h: number, style = 'droit'): Primitive[] {
  switch (style) {
    case 'caisson':
      return [
        plateau(0, 0, l, p, h),
        panneau(-l / 2 + 15, p, h),
        ...caisson(l / 2 - 230, p, h),
        voile(l, p, h),
      ];
    case 'metal':
      return [plateau(0, 0, l, p, h), ...cadreMetal(l, p, h)];
    case 'treteaux':
      return [
        plateau(0, 0, l, p, h),
        ...treteau(-l / 2 + 220, p, h),
        ...treteau(l / 2 - 220, p, h),
      ];
    case 'assis-debout':
      return [
        plateau(0, 0, l, p, h),
        ...[-1, 1].flatMap((i) => [
          boite(i * (l / 2 - 180), 0, 0, 70, p - 80, 30, 'sombre'),
          boite(i * (l / 2 - 180), -p * 0.1, 30, 80, 80, h - EP - 90, 'sombre'),
        ]),
        boite(0, -p * 0.1, h - EP - 60, l - 300, 60, 60, 'sombre'),
        boite(l / 2 - 120, p / 2 - 20, h - EP - 25, 90, 20, 22, 'metal'),
      ];
    case 'double':
      return [
        plateau(0, -p / 4 - 5, l, p / 2 - 10, h),
        plateau(0, p / 4 + 5, l, p / 2 - 10, h),
        ...cadreMetal(l, p, h),
        boite(0, 0, h - EP - 50, l - 80, 25, 50, 'sombre'),
        douce(0, 0, h, l - 100, 30, 420, 10, 'textile'),
      ];
    case 'etagere': {
      const z = 750;
      return [
        plateau(0, 0, l, p, z),
        panneau(-l / 2 + 15, p, h + EP),
        panneau(l / 2 - 15, p, h + EP),
        boite(0, -p / 2 + 9, z, l - 60, 18, h - z),
        ...[1_150, 1_480, h - 20].map((zz) => boite(0, -p / 2 + 150, zz, l - 60, 280, 20, 'clair')),
      ];
    }
    case 'secretaire':
      return [
        plateau(0, 0, l, p, 750),
        ...cadreMetal(l, p, 750)
          .slice(0, 4)
          .map((f) => ({ ...f, teinte: 'bois' as const })),
        boite(0, -p / 4, 750, l, p / 2, h - 750),
        boite(0, -p / 4 + 2, 750 + (h - 750) / 2, l - 40, p / 2, 18, 'clair'),
        boite(0, -p / 4 + 2, 760, 18, p / 2, h - 770, 'clair'),
      ];
    case 'direction':
      return [
        plateau(0, 0, l, p, h, 45),
        panneau(-l / 2 + 40, p, h + 15, 80),
        panneau(l / 2 - 40, p, h + 15, 80),
        boite(0, -p / 2 + 60, 120, l - 160, 30, h - 165),
        ...caisson(l / 2 - 320, p, h).slice(1),
      ];
    case 'angle':
    case 'angle-gauche': {
      const prof = Math.min(800, p / 2);
      const formes = [
        plateau(0, -p / 2 + prof / 2, l, prof, h),
        plateau(l / 2 - prof / 2, prof / 2, prof, p - prof, h),
        boite(-l / 2 + 15, -p / 2 + prof / 2, 0, 30, prof - 40, h - EP),
        boite(l / 2 - prof / 2, p / 2 - 15, 0, prof - 40, 30, h - EP),
        cylindre(l / 2 - prof - 60, -p / 2 + prof - 60, 0, 60, h - EP, 'sombre'),
        ...caisson(l / 2 - 230, prof, h).map((f) => ({
          ...f,
          centre: { ...f.centre, y: f.centre.y - p / 2 + prof / 2 },
        })),
      ];
      return style === 'angle-gauche'
        ? formes.map((f) => ({ ...f, centre: { ...f.centre, x: -f.centre.x } }))
        : formes;
    }
    default:
      return [
        plateau(0, 0, l, p, h),
        panneau(-l / 2 + 15, p, h),
        panneau(l / 2 - 15, p, h),
        voile(l, p, h),
      ];
  }
}

/** Siège de bureau sur roulettes : croisillon, vérin, assise, dossier (appui-tête si haut). */
function siege(l: number, p: number, h: number, style: string): Primitive[] {
  const assise = 470;
  const haut = style === 'ergonomique';
  return [
    boite(0, 0, 30, l * 0.9, 50, 30, 'sombre'),
    boite(0, 0, 30, 50, p * 0.9, 30, 'sombre'),
    ...[-1, 1].flatMap((i) => [
      cylindre((i * l * 0.9) / 2 - i * 25, 0, 0, 50, 30, 'sombre'),
      cylindre(0, (i * p * 0.9) / 2 - i * 25, 0, 50, 30, 'sombre'),
    ]),
    cylindre(0, 0, 60, 50, assise - 120, 'metal'),
    douce(0, 20, assise - 60, l * 0.8, p * 0.75, 80, 30),
    douce(
      0,
      -p / 2 + 60,
      assise + 80,
      l * 0.75,
      50,
      h - assise - 80 - (haut ? 180 : 0),
      30,
      haut ? 'sombre' : 'principal',
    ),
    ...(haut ? [douce(0, -p / 2 + 60, h - 160, l * 0.45, 70, 160, 30)] : []),
    ...[-1, 1].map((i) =>
      douce((i * l * 0.8) / 2, 10, assise + 150, 50, p * 0.45, 30, 10, 'sombre'),
    ),
  ];
}

export function formeBureau(
  symbole: SymboleObjet,
  d: Dimensions,
  style?: string,
): Primitive[] | null {
  if (symbole === 'bureau') return bureau(d.l, d.p, d.h, style);
  if (symbole === 'chaise' && (style === 'bureau' || style === 'ergonomique'))
    return siege(d.l, d.p, d.h, style);
  return null;
}
