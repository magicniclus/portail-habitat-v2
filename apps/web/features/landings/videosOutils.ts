import type { VideoVsl } from '@/features/pro/VslPro';

/**
 * Vidéos de présentation des outils, façon VSL (sans voix) : accroche, problème, solution, vraies
 * captures de l'espace animées, preuves chiffrées, appel à l'action, sous-titres mot à mot :
 * `public/landing/videos/outils/{id}.mp4` et son affiche `{id}.webp`. Durées en secondes.
 */
export const VIDEOS_OUTILS: Record<string, { duree: number }> = {
  chantiers: { duree: 40 },
  fiche: { duree: 42 },
  site: { duree: 46 },
  devis: { duree: 40 },
  suivi: { duree: 45 },
  avis: { duree: 41 },
};

/**
 * Film de vente de la landing chantiers (`scripts/vsl`) : chaque durée existe en 16:9 (`.mp4`) et
 * en 9:16 (`-vertical.mp4`), affiches `chantiers.webp` et `chantiers-vertical.webp`.
 */
export const VSL_CHANTIERS: VideoVsl = {
  base: '/landing/videos/vsl/chantiers',
  duree: 223,
  accroche: 'C’est gratuit… où est le piège ?',
  vertical: true,
  versions: [
    { libelle: '1 minute', base: '/landing/videos/vsl/chantiers-60s', duree: 58 },
    { libelle: '30 secondes', base: '/landing/videos/vsl/chantiers-30s', duree: 30 },
  ],
};

export const cheminVideoOutil = (id: string) => `/landing/videos/outils/${id}`;

/**
 * 42 → « 0:42 ».
 * @public Utilisé par la section des outils gratuits, gardée en réserve (hors landings).
 */
export const dureeVideo = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
