/** Studio vidéo (STUDIO.md) : formats de sortie, durées et conservation. */

export const FORMATS_STUDIO = {
  vertical: { largeur: 1080, hauteur: 1920, libelle: 'Vertical 9:16 (TikTok, Reels, Shorts)' },
  horizontal: { largeur: 1920, hauteur: 1080, libelle: 'Horizontal 16:9 (YouTube)' },
  carre: { largeur: 1080, hauteur: 1080, libelle: 'Carré 1:1' },
} as const;
export type FormatStudio = keyof typeof FORMATS_STUDIO;
export const NOMS_FORMATS = Object.keys(FORMATS_STUDIO) as FormatStudio[];
export const FORMAT_DEFAUT: FormatStudio = 'vertical';

/** Une vidéo dure de 10 s à 3 min. */
export const DUREE_MIN_MS = 10_000;
export const DUREE_MAX_MS = 180_000;
/** Un plan plus court qu'une demi-seconde est illisible. */
export const PLAN_MIN_MS = 400;

/** Images par seconde du rendu final. */
export const IMAGES_PAR_SECONDE = 30;

/** Prises brutes (écran, voix, caméra) supprimées après 30 jours ; les vidéos finies restent. */
export const CONSERVATION_PRISES_JOURS = 30;

/** Une prise d'enregistrement dure au plus 10 min (limite d'envoi et de transcription). */
export const PRISE_MAX_MS = 10 * 60_000;
