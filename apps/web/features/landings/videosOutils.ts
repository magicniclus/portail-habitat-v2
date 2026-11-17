import type { VideoVsl } from '@/features/pro/VslPro';

/**
 * Vidéos de présentation des outils, façon VSL (sans voix) : accroche, problème, solution, vraies
 * captures de l'espace animées, preuves chiffrées, appel à l'action, sous-titres mot à mot :
 * `public/landing/videos/outils/{id}.mp4` et son affiche `{id}.webp`. Durées en secondes.
 * @public Utilisé par la section des outils gratuits, gardée en réserve (hors landings).
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
 * en 9:16 (`-vertical.mp4`), affiches `chantiers.webp` et `chantiers-vertical.webp`. Sur la landing
 * chantiers, la version complète seule (sans choix de durée, décision du 17/11/2026).
 */
export const VSL_CHANTIERS_COMPLET: VideoVsl = {
  base: '/landing/videos/vsl/chantiers',
  duree: 223,
  accroche: 'C’est gratuit… où est le piège ?',
  vertical: true,
};

/**
 * Le même film avec ses versions courtes au choix sous le lecteur. Retiré de /pro le 17/11/2026
 * (demande du propriétaire : version complète seule partout).
 * @public Gardé en réserve avec ses fichiers 1 min et 30 s.
 */
export const VSL_CHANTIERS: VideoVsl = {
  ...VSL_CHANTIERS_COMPLET,
  versions: [
    { libelle: '1 min', base: '/landing/videos/vsl/chantiers-60s', duree: 58 },
    { libelle: '30 s', base: '/landing/videos/vsl/chantiers-30s', duree: 30 },
  ],
};

/** Film de vente de la landing site internet (`scripts/vsl`, film « site ») : 16:9 et 9:16. */
export const VSL_SITE: VideoVsl = {
  base: '/landing/videos/vsl/site',
  duree: 114,
  accroche: 'Votre site internet d’artisan, gratuit',
  vertical: true,
};

/** Film de vente de la landing devis et factures (film « devis ») : 16:9 et 9:16. */
export const VSL_DEVIS: VideoVsl = {
  base: '/landing/videos/vsl/devis',
  duree: 100,
  accroche: 'Vos devis et factures, gratuits',
  vertical: true,
};

/**
 * Films de vente courts (30 s, voix, sous-titres incrustés) des outils sans landing, ouverts depuis
 * les tuiles : `vsl/{id}.mp4` (16:9), `vsl/{id}-vertical.mp4` (9:16) et leurs affiches `.webp`.
 */
export const VSL_OUTILS: Record<string, { base: string } | undefined> = {
  fiche: { base: '/landing/videos/vsl/fiche' },
  avis: { base: '/landing/videos/vsl/avis' },
  suivi: { base: '/landing/videos/vsl/suivi' },
};

export const cheminVideoOutil = (id: string) => `/landing/videos/outils/${id}`;

/**
 * 42 → « 0:42 ».
 * @public Utilisé par la section des outils gratuits, gardée en réserve (hors landings).
 */
export const dureeVideo = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
