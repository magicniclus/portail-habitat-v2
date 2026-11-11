/**
 * Films de présentation des outils (sans voix, sous-titres incrustés, vraies captures de l'espace) :
 * `public/landing/videos/outils/{id}.mp4` et son affiche `{id}.webp`. Durées en secondes.
 */
export const VIDEOS_OUTILS: Record<string, { duree: number }> = {
  chantiers: { duree: 37 },
  fiche: { duree: 46 },
  site: { duree: 60 },
  devis: { duree: 65 },
  suivi: { duree: 40 },
  avis: { duree: 43 },
};

export const cheminVideoOutil = (id: string) => `/landing/videos/outils/${id}`;

/** 42 → « 0:42 ». */
export const dureeVideo = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
