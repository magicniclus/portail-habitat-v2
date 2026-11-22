import type { CategorieObjet, Ligne } from './catalogue';
import { LIGNES_BUREAU } from './catalogueBureau';
import { LIGNES_CANAPES } from './catalogueCanapes';
import { LIGNES_TABLES } from './catalogueTables';
import { MUR } from './catalogueOptions';

/** Catalogue d'objets (DES-21) : chambres, dressing, bureau, séjour. */
export const LIGNES_MAISON: Partial<Record<CategorieObjet, Ligne[]>> = {
  chambre: [
    ['lit-140', 'Lit 140 × 190', 'lit', 1400, 1900, 450, MUR],
    ['lit-160', 'Lit 160 × 200', 'lit', 1600, 2000, 450, MUR],
    ['lit-90', 'Lit 90 × 190', 'lit', 900, 1900, 450, MUR],
    ['chevet', 'Table de chevet', 'buffet', 450, 400, 550, MUR],
    ['armoire', 'Armoire', 'armoire', 1200, 600, 2200, { ...MUR, plages: { l: [800, 2400] } }],
    ['commode', 'Commode', 'buffet', 1000, 500, 850, MUR],
    ['lit-180', 'Lit 180 × 200', 'lit', 1800, 2000, 450, MUR],
    ['coiffeuse', 'Coiffeuse', 'table', 1000, 450, 750, MUR],
    ['banc-lit', 'Banc de lit', 'banc', 1200, 400, 450],
  ],
  dressing: [
    [
      'penderie',
      'Penderie',
      'armoire',
      1000,
      600,
      2200,
      { ...MUR, plages: { l: [500, 2000] }, prestationId: 'dressing' },
    ],
    [
      'etageres',
      'Module étagères',
      'armoire',
      800,
      400,
      2200,
      { ...MUR, plages: { l: [400, 1600] }, prestationId: 'dressing' },
    ],
  ],
  enfant: [
    ['lit-bebe', 'Lit bébé', 'lit', 600, 1200, 900, MUR],
    ['lit-enfant', 'Lit enfant 90 × 190', 'lit', 900, 1900, 450, MUR],
    ['bureau-enfant', 'Bureau enfant', 'table', 1000, 480, 580, MUR],
  ],
  bureau: LIGNES_BUREAU,
  sejour: [
    ...LIGNES_CANAPES,
    // Fauteuils et assises
    ['fauteuil', 'Fauteuil', 'canape', 850, 850, 850],
    ['fauteuil-lounge', 'Fauteuil lounge', 'canape', 850, 1000, 980],
    ['fauteuil-classique', 'Fauteuil classique', 'canape', 800, 720, 1000],
    ['fauteuil-cosy', 'Fauteuil cosy', 'canape', 850, 850, 800, { style: 'fauteuil' }],
    ['pouf', 'Pouf', 'rectangle', 800, 560, 420],
    ...LIGNES_TABLES,
    ['bout-de-canape', 'Bout de canapé industriel', 'table', 600, 580, 490],
    ['chaise', 'Chaise', 'chaise', 450, 500, 900],
    // Rangements
    ['buffet', 'Buffet', 'buffet', 1800, 450, 850, MUR],
    ['buffet-haut', 'Buffet haut', 'buffet', 1000, 450, 1300, MUR],
    ['meuble-tv', 'Meuble TV', 'buffet', 1600, 400, 500, MUR],
    ['console', 'Console', 'table', 1200, 350, 800, MUR],
    ['banc', 'Banc', 'banc', 1400, 350, 450, { plages: { l: [800, 2400] } }],
    [
      'etagere-sejour',
      'Étagère métal et bois',
      'etagere',
      1600,
      490,
      1570,
      { ...MUR, plages: { l: [400, 3000] } },
    ],
  ],
};
