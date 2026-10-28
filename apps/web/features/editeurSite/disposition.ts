import type { Panneau } from './BarreEditeur';

/** Colonnes de l'éditeur sur grand écran : rail, panneau ouvert, page, réglages (320 px). */
export const colonnes = (outils: boolean, panneau: Panneau | null) =>
  outils
    ? `auto ${panneau ? (panneau === 'seo' ? '340px ' : '300px ') : ''}minmax(0,1fr) 320px`
    : 'minmax(0,1fr)';
