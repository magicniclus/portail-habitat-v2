import type { ObjetCatalogue } from './catalogue';

/** Posé contre un mur (dos au mur). */
export const MUR = { contreMur: true } as const;
/** Largeur réglable d'un module de cuisine. */
export const largeurModule: Pick<ObjetCatalogue, 'plages'> = { plages: { l: [150, 1200] } };
