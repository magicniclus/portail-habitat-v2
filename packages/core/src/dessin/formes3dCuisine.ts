import type { SymboleObjet } from './catalogue';
import {
  boite,
  cylindre,
  facade,
  repartir,
  type Dimensions,
  type Primitive,
} from './formes3dOutils';

/**
 * Cuisine au dessin simple et personnalisable : façades (teinte `principal`), plan de travail
 * (`plan`) et poignées (`poignee`) suivent les couleurs choisies dans l'inspecteur. Variantes
 * par `style` : tiroirs, évier deux bacs, plaques induction / gaz / domino, hottes murale /
 * îlot / intégrée, réfrigérateurs pose libre / américain / sous plan, colonnes four / frigo /
 * micro-ondes, meuble haut vitré.
 */

/** Plinthe, caisson et plan de travail d'un meuble bas (hauteur totale h). */
const caisson = (l: number, p: number, h: number) => [
  boite(0, 10, 0, l, p - 20, 100, 'sombre'),
  boite(0, 0, 100, l, p, h - 140),
  boite(0, 15, h - 40, l, p + 30, 40, 'plan'),
];

/** Façade à tiroirs : joints horizontaux, une poignée par tiroir. */
const tiroirs = (l: number, p: number, z: number, h: number, n = 3) => {
  const pas = h / n;
  return Array.from({ length: n }, (_, i) => [
    ...(i > 0 ? [boite(0, p / 2 + 2, z + i * pas - 4, l - 20, 4, 8, 'sombre')] : []),
    boite(0, p / 2 + 12, z + (i + 1) * pas - 70, Math.min(300, l - 120), 16, 16, 'poignee'),
  ]).flat();
};

/** Porte de four : vitre sombre, hublot et poignée, sur la hauteur `h` à partir de `z`. */
const four = (l: number, p: number, z: number, h = 560) => [
  boite(0, p / 2 + 5, z, l - 60, 10, h, 'sombre'),
  boite(0, p / 2 + 10, z + 100, l - 200, 4, h - 220, 'verre'),
  boite(0, p / 2 + 25, z + h - 60, l - 200, 20, 20, 'metal'),
];

/** Foyers de cuisson sur le plan (z = dessus du plan). */
function foyers(l: number, p: number, z: number, style?: string): Primitive[] {
  const largeur = Math.min(l - 60, style === 'domino' ? 280 : l * 0.9);
  if (style === 'gaz')
    return [
      boite(0, 30, z, largeur, p * 0.8, 10, 'metal'),
      ...[-1, 1].flatMap((i) =>
        [-1, 1].map((j) =>
          cylindre((i * largeur) / 4, 30 + (j * p) / 5, z + 10, 110, 25, 'sombre'),
        ),
      ),
    ];
  const zones = style === 'domino' ? 2 : l >= 750 ? 5 : 4;
  const xs = zones === 2 ? [0, 0] : zones === 5 ? [-1, -1, 0, 1, 1] : [-1, -1, 1, 1];
  const ys = zones === 2 ? [-1, 1] : zones === 5 ? [-1, 1, 0, -1, 1] : [-1, 1, -1, 1];
  return [
    boite(0, 30, z, largeur, p * 0.8, 8, 'sombre'),
    ...xs.map((x, i) =>
      cylindre(
        (x * largeur) / 3.4,
        30 + (ys[i]! * p) / 5.5,
        z + 8,
        x === 0 && zones === 5 ? 220 : 160,
        2,
        'metal',
      ),
    ),
  ];
}

export function formeCuisine(
  symbole: SymboleObjet,
  d: Dimensions,
  style?: string,
): Primitive[] | null {
  const { l, p, h } = d;
  switch (symbole) {
    case 'meuble_bas':
      return [
        ...caisson(l, p, h),
        ...(style === 'tiroirs' ? tiroirs(l, p, 100, h - 140) : facade(l, p, 100, h - 140, 450)),
      ];
    case 'lave_vaisselle':
      return [...caisson(l, p, h), boite(0, p / 2 + 12, h - 130, l - 120, 16, 16, 'poignee')];
    case 'four':
      return [...caisson(l, p, h), ...four(l, p, 180), ...tiroirs(l, p, 100, 80, 1)];
    case 'evier': {
      const bacs = style === 'double' ? [-l * 0.2, l * 0.13] : [-l * 0.15];
      return [
        ...caisson(l, p, h),
        ...bacs.map((x) =>
          boite(x, 30, h - 30, l * (bacs.length > 1 ? 0.3 : 0.45), p * 0.6, 32, 'metal'),
        ),
        cylindre(l * 0.25, -p / 2 + 90, h, 40, 280, 'metal'),
        boite(l * 0.25, -p / 2 + 160, h + 240, 30, 160, 30, 'metal'),
        ...facade(l, p, 100, h - 140, 450),
      ];
    }
    case 'plaque':
      return [...caisson(l, p, h), ...foyers(l, p, h, style), ...tiroirs(l, p, 100, h - 140, 2)];
    case 'meuble_haut':
      if (style === 'vitre')
        return [
          boite(0, 0, 0, l, p, h),
          ...repartir(
            l,
            Math.max(1, Math.round(l / 450)),
            l / Math.max(1, Math.round(l / 450)) / 2,
          ).map((x) =>
            boite(
              x,
              p / 2 + 3,
              80,
              l / Math.max(1, Math.round(l / 450)) - 120,
              4,
              h - 160,
              'verre',
            ),
          ),
          ...facade(l, p, 0, h, 450, 'bas'),
        ];
      return [boite(0, 0, 0, l, p, h), ...facade(l, p, 0, h, 450, 'bas')];
    case 'hotte':
      if (style === 'integree')
        return [
          boite(0, 0, 120, l, p, h - 120),
          ...facade(l, p, 120, h - 120, 450, 'bas'),
          boite(0, 20, 0, l - 20, p - 40, 120, 'metal'),
          boite(0, p / 2 - 30, 0, l - 40, 30, 60, 'sombre'),
        ];
      // Murale ou îlot : hotte en pyramide sous une cheminée.
      return [
        boite(0, 0, 0, l, p, 80, 'metal'),
        boite(
          0,
          style === 'ilot' ? 0 : -p * 0.1,
          80,
          l * 0.7,
          p * (style === 'ilot' ? 0.7 : 0.6),
          140,
          'metal',
        ),
        boite(0, style === 'ilot' ? 0 : -p / 2 + 140, 220, 300, 260, h - 220, 'metal'),
      ];
    case 'colonne': {
      const cases =
        style === 'frigo'
          ? [boite(0, p / 2 + 2, h * 0.55, l - 20, 4, 8, 'sombre')]
          : style === 'micro'
            ? [...four(l, p, 750), ...four(l, p, 1360, 380)]
            : four(l, p, 850);
      return [
        boite(0, 0, 0, l, p, h),
        ...cases,
        boite(l / 2 - 80, p / 2 + 12, h * 0.75, 16, 16, 220, 'poignee'),
        boite(l / 2 - 80, p / 2 + 12, h * 0.2, 16, 16, 220, 'poignee'),
      ];
    }
    case 'frigo': {
      const dessus = style === 'top' ? [boite(0, 0, h - 30, l, p, 30, 'plan')] : [];
      const portes =
        style === 'americain'
          ? [
              boite(0, p / 2 + 2, 20, 8, 4, h - 40, 'sombre'),
              ...[-1, 1].map((i) => boite(i * 60, p / 2 + 14, h * 0.45, 16, 16, h * 0.4, 'metal')),
              boite(-l / 4, p / 2 + 4, h * 0.5, 180, 6, 260, 'sombre'),
            ]
          : [
              boite(0, p / 2 + 2, h * (style === 'top' ? 0.7 : 0.35), l - 20, 4, 8, 'sombre'),
              boite(
                l / 2 - 60,
                p / 2 + 14,
                h * (style === 'top' ? 0.75 : 0.5),
                16,
                16,
                h * 0.22,
                'metal',
              ),
              ...(style === 'top'
                ? []
                : [boite(l / 2 - 60, p / 2 + 14, h * 0.12, 16, 16, h * 0.15, 'metal')]),
            ];
      return [boite(0, 0, 0, l, p, h - dessus.length * 30, 'metal'), ...portes, ...dessus];
    }
    default:
      return null;
  }
}
