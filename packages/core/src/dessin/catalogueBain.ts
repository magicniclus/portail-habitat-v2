import type { CategorieObjet, Ligne } from './catalogue';
import { MUR } from './catalogueOptions';

const contre = (extra: object = {}) => ({ ...MUR, ...extra });

/** Catalogue d'objets (DES-21) : salle de bain (baignoires, douches, WC, meubles vasque). */
export const LIGNES_BAIN: Partial<Record<CategorieObjet, Ligne[]>> = {
  salle_de_bain: [
    // Baignoires
    [
      'baignoire',
      'Baignoire',
      'baignoire',
      1700,
      700,
      550,
      contre({ plages: { l: [1400, 1900], p: [700, 900] } }),
    ],
    [
      'baignoire-180',
      'Grande baignoire 180',
      'baignoire',
      1800,
      800,
      580,
      contre({ plages: { l: [1600, 2000], p: [750, 900] } }),
    ],
    [
      'baignoire-ilot',
      'Baignoire îlot',
      'baignoire',
      1700,
      780,
      600,
      { style: 'ilot', plages: { l: [1500, 1900], p: [700, 900] } },
    ],
    [
      'baignoire-angle',
      'Baignoire d’angle',
      'baignoire',
      1400,
      1400,
      550,
      contre({ style: 'angle', plages: { l: [1200, 1600], p: [1200, 1600] } }),
    ],
    [
      'baignoire-douche',
      'Baignoire avec pare-bain',
      'baignoire',
      1700,
      750,
      550,
      contre({ style: 'douche', plages: { l: [1500, 1900], p: [700, 900] } }),
    ],
    // Douches
    [
      'douche-italienne',
      'Douche à l’italienne',
      'douche',
      1200,
      900,
      0,
      contre({
        style: 'italienne',
        plages: { l: [800, 1800], p: [800, 1200] },
        prestationId: 'sdb-douche',
      }),
    ],
    [
      'douche-grande',
      'Grande douche ouverte',
      'douche',
      1600,
      1000,
      0,
      contre({
        style: 'grande',
        plages: { l: [1400, 2200], p: [900, 1400] },
        prestationId: 'sdb-douche',
      }),
    ],
    [
      'douche-angle',
      'Douche d’angle',
      'douche',
      900,
      900,
      0,
      contre({
        style: 'angle',
        plages: { l: [800, 1200], p: [800, 1200] },
        prestationId: 'sdb-douche',
      }),
    ],
    [
      'douche-niche',
      'Douche en niche, porte coulissante',
      'douche',
      1400,
      800,
      0,
      contre({
        style: 'niche',
        plages: { l: [1000, 1800], p: [700, 1000] },
        prestationId: 'sdb-douche',
      }),
    ],
    [
      'douche-cabine',
      'Cabine de douche',
      'douche',
      900,
      900,
      0,
      contre({
        style: 'cabine',
        plages: { l: [800, 1200], p: [800, 1200] },
        prestationId: 'sdb-douche',
      }),
    ],
    // WC
    ['wc-suspendu', 'WC suspendu', 'wc', 380, 550, 400, contre({ prestationId: 'wc' })],
    ['wc-sol', 'WC au sol', 'wc', 380, 680, 400, contre({ style: 'sol', prestationId: 'wc' })],
    [
      'wc-lave-mains',
      'WC avec lave-mains',
      'wc',
      400,
      600,
      400,
      contre({ style: 'lave-mains', prestationId: 'wc' }),
    ],
    // Meubles vasque
    ['vasque', 'Meuble vasque', 'vasque', 800, 500, 850, contre({ plages: { l: [600, 1000] } })],
    [
      'double-vasque',
      'Double vasque',
      'vasque',
      1400,
      500,
      850,
      contre({ plages: { l: [1200, 1800] } }),
    ],
    [
      'vasque-poser',
      'Vasque à poser',
      'vasque',
      900,
      480,
      850,
      contre({ style: 'poser', plages: { l: [600, 1600] } }),
    ],
    [
      'vasque-suspendue',
      'Meuble vasque suspendu',
      'vasque',
      800,
      460,
      850,
      contre({ style: 'suspendue', plages: { l: [600, 1400] } }),
    ],
    // Autres
    [
      'seche-serviettes',
      'Sèche-serviettes',
      'radiateur',
      500,
      100,
      1200,
      contre({ altitude: 300 }),
    ],
    ['lave-linge', 'Lave-linge', 'rectangle', 600, 600, 850, MUR],
  ],
};
