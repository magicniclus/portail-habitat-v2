import type { CategorieObjet, Ligne, ModuleCuisine, ObjetCatalogue } from './catalogue';
import { largeurModule, MUR } from './catalogueOptions';

/** Meuble de cuisine posé contre un mur, compté au métré de la pose de cuisine. */
const k = (cuisine: ModuleCuisine, extra: Partial<ObjetCatalogue> = {}) => ({
  ...MUR,
  cuisine,
  prestationId: 'cuisine-pose',
  ...extra,
});
const reglable = largeurModule;
const haut = (extra: Partial<ObjetCatalogue> = {}) => k('haut', { altitude: 1450, ...extra });

/**
 * Catalogue d'objets (DES-21) : cuisine complète. Façades, plan de travail et poignées se
 * personnalisent dans l'inspecteur, puis s'appliquent à toute la cuisine d'un clic.
 */
export const LIGNES_CUISINE: Partial<Record<CategorieObjet, Ligne[]>> = {
  cuisine: [
    // Meubles bas
    ['meuble-bas-30', 'Meuble bas 30 cm', 'meuble_bas', 300, 600, 870, k('bas', reglable)],
    ['meuble-bas-40', 'Meuble bas 40 cm', 'meuble_bas', 400, 600, 870, k('bas', reglable)],
    ['meuble-bas-60', 'Meuble bas', 'meuble_bas', 600, 600, 870, k('bas', reglable)],
    ['meuble-bas-80', 'Meuble bas 80 cm', 'meuble_bas', 800, 600, 870, k('bas', reglable)],
    [
      'meuble-tiroirs',
      'Meuble à tiroirs',
      'meuble_bas',
      800,
      600,
      870,
      k('bas', { ...reglable, style: 'tiroirs' }),
    ],
    ['meuble-bas-angle', 'Meuble bas d’angle', 'meuble_bas', 900, 900, 870, k('bas')],
    // Évier et cuisson
    ['evier-120', 'Meuble évier', 'evier', 1200, 600, 870, k('evier', reglable)],
    [
      'evier-double',
      'Évier deux bacs',
      'evier',
      1200,
      600,
      870,
      k('evier', { ...reglable, style: 'double' }),
    ],
    ['plaque-60', 'Plaque induction', 'plaque', 600, 600, 870, k('plaque')],
    ['plaque-80', 'Plaque induction 80 cm', 'plaque', 800, 600, 870, k('plaque')],
    ['plaque-gaz', 'Plaque gaz', 'plaque', 600, 600, 870, k('plaque', { style: 'gaz' })],
    ['plaque-domino', 'Plaque domino', 'plaque', 300, 600, 870, k('plaque', { style: 'domino' })],
    ['four', 'Four encastré', 'four', 600, 600, 870, k('bas')],
    [
      'cuisiniere',
      'Cuisinière',
      'plaque',
      500,
      650,
      860,
      k('plaque', { plages: { l: [500, 600] } }),
    ],
    ['lave-vaisselle', 'Lave-vaisselle', 'lave_vaisselle', 600, 600, 850, k('bas')],
    // Meubles hauts et hottes
    ['meuble-haut-60', 'Meuble haut', 'meuble_haut', 600, 350, 700, haut(reglable)],
    ['meuble-haut-90', 'Meuble haut 90 cm', 'meuble_haut', 900, 350, 700, haut(reglable)],
    [
      'meuble-haut-vitre',
      'Meuble haut vitré',
      'meuble_haut',
      600,
      350,
      700,
      haut({ ...reglable, style: 'vitre' }),
    ],
    [
      'hotte-60',
      'Hotte murale',
      'hotte',
      900,
      500,
      900,
      haut({ altitude: 1550, plages: { l: [600, 1200] } }),
    ],
    [
      'hotte-ilot',
      'Hotte îlot',
      'hotte',
      900,
      600,
      900,
      { cuisine: 'haut', altitude: 1600, style: 'ilot' },
    ],
    ['hotte-integree', 'Hotte intégrée', 'hotte', 600, 350, 700, haut({ style: 'integree' })],
    [
      'etagere-cuisine',
      'Étagère murale',
      'etagere',
      800,
      250,
      400,
      { ...MUR, plages: { l: [300, 2000] }, altitude: 1500 },
    ],
    // Colonnes et froid
    ['colonne-60', 'Colonne four', 'colonne', 600, 600, 2150, k('colonne')],
    [
      'colonne-micro',
      'Colonne four et micro-ondes',
      'colonne',
      600,
      600,
      2150,
      k('colonne', { style: 'micro' }),
    ],
    [
      'colonne-frigo',
      'Colonne réfrigérateur',
      'colonne',
      600,
      600,
      2150,
      k('frigo', { style: 'frigo' }),
    ],
    [
      'refrigerateur',
      'Réfrigérateur combiné',
      'frigo',
      600,
      650,
      1850,
      { ...MUR, cuisine: 'frigo' },
    ],
    [
      'frigo-americain',
      'Réfrigérateur américain',
      'frigo',
      900,
      700,
      1800,
      { ...MUR, cuisine: 'frigo', style: 'americain' },
    ],
    [
      'frigo-top',
      'Réfrigérateur sous plan',
      'frigo',
      600,
      600,
      850,
      { ...MUR, cuisine: 'frigo', style: 'top' },
    ],
    // Îlots et repas
    [
      'ilot',
      'Îlot central',
      'ilot',
      1800,
      900,
      900,
      { plages: { l: [1000, 3000], p: [600, 1200] }, cuisine: 'bas', prestationId: 'cuisine-pose' },
    ],
    [
      'ilot-repas',
      'Îlot avec coin repas',
      'ilot',
      2400,
      1100,
      900,
      { plages: { l: [1400, 3600], p: [900, 1400] }, cuisine: 'bas', prestationId: 'cuisine-pose' },
    ],
    [
      'table-haute',
      'Table haute',
      'table_haute',
      1400,
      700,
      1050,
      { plages: { l: [800, 2400], p: [500, 1000] } },
    ],
    ['tabouret-bar', 'Tabouret de bar', 'tabouret', 460, 470, 1020, { plages: { h: [800, 1150] } }],
    ['tabouret', 'Tabouret', 'tabouret', 450, 470, 460],
  ],
};
