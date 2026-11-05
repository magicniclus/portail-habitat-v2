import type { VideoTendance } from './prompts';

/** Durée ISO 8601 de l'API YouTube (« PT1M5S ») en secondes ; `null` si illisible. */
export function dureeIso(d: string): number | null {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d);
  if (!m || d === 'P' || d === 'PT') return null;
  const [, j, h, mi, s] = m.map((x) => Number(x ?? 0));
  return j! * 86_400 + h! * 3_600 + mi! * 60 + s!;
}

/** Vidéos courtes (3 min au plus), classées par vues par jour : l'élan compte plus que le total. */
export function classerTendances(
  videos: readonly Omit<VideoTendance, 'vuesParJour'>[],
  maintenant: number,
): VideoTendance[] {
  return videos
    .filter((v) => v.dureeS > 0 && v.dureeS <= 180)
    .map((v) => {
      const jours = Math.max(1, (maintenant - Date.parse(v.publieeLe)) / 86_400_000);
      return { ...v, vuesParJour: v.vues / jours };
    })
    .sort((a, b) => b.vuesParJour - a.vuesParJour);
}

/** Recherches lancées sur YouTube quand l'auteur ne donne pas de thème. */
export const RECHERCHES_PAR_DEFAUT = [
  'artisan trouver des clients',
  'artisan bâtiment conseils',
  'plombier chantier',
  'devis artisan',
  'rénovation avant après',
] as const;
