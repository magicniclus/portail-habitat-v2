import type { Panneau } from './BarreEditeur';

/**
 * Colonnes de l'éditeur sur grand écran : rail (64 px), panneau (300 px), page, réglages (320 px).
 * Toujours quatre colonnes (0 px quand elles sont fermées) : la largeur s'anime d'un état à l'autre.
 */
export const colonnes = (outils: boolean, panneau: Panneau | null) =>
  `${outils ? '64px' : '0px'} ${outils && panneau ? '300px' : '0px'} minmax(0,1fr) ${outils ? '320px' : '0px'}`;
