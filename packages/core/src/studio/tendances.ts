import type { VideoTendance } from './prompts';

/** Durée ISO 8601 de l'API YouTube (« PT1M5S ») en secondes ; `null` si illisible. */
export function dureeIso(d: string): number | null {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d);
  if (!m || d === 'P' || d === 'PT') return null;
  const [, j, h, mi, s] = m.map((x) => Number(x ?? 0));
  return j! * 86_400 + h! * 3_600 + mi! * 60 + s!;
}

/** Vidéo telle que relevée sur YouTube, avant le calcul des indicateurs. */
export type VideoBrute = Omit<
  VideoTendance,
  'vuesParJour' | 'engagement' | 'multiplicateur' | 'scoreViral'
>;

/**
 * Potentiel viral de 0 à 100 :
 * - élan : vues par jour, sur une échelle logarithmique (1 000/jour ≈ 45, 100 000/jour ≈ 75) ;
 * - engagement : (j'aime + commentaires) / vues, jusqu'à 15 points (5 % ≈ 10) ;
 * - dépassement de l'audience : vues / abonnés, jusqu'à 25 points (×1 ≈ 5, ×10 ≈ 17).
 */
export function scoreViral(v: {
  vuesParJour: number;
  engagement: number | null;
  multiplicateur: number | null;
}): number {
  const elan = Math.log10(v.vuesParJour + 1) * 15;
  const engagement = v.engagement === null ? 0 : Math.min(15, v.engagement * 200);
  const percee = v.multiplicateur === null ? 0 : Math.min(25, Math.log2(v.multiplicateur + 1) * 5);
  return Math.round(Math.max(0, Math.min(100, elan + engagement + percee)));
}

/** Vidéos courtes (3 min au plus) avec leurs indicateurs, classées par potentiel viral. */
export function classerTendances(
  videos: readonly VideoBrute[],
  maintenant: number,
): VideoTendance[] {
  return videos
    .filter((v) => v.dureeS > 0 && v.dureeS <= 180)
    .map((v) => {
      const jours = Math.max(1, (maintenant - Date.parse(v.publieeLe)) / 86_400_000);
      const vuesParJour = v.vues / jours;
      const engagement =
        v.vues > 0 && (v.likes !== null || v.commentaires !== null)
          ? ((v.likes ?? 0) + (v.commentaires ?? 0)) / v.vues
          : null;
      const multiplicateur = v.abonnes ? v.vues / v.abonnes : null;
      return {
        ...v,
        vuesParJour,
        engagement,
        multiplicateur,
        scoreViral: scoreViral({ vuesParJour, engagement, multiplicateur }),
      };
    })
    .sort((a, b) => b.scoreViral - a.scoreViral || b.vuesParJour - a.vuesParJour);
}

/** Lien pour regarder la vidéo (format Shorts de YouTube). */
export const lienVideo = (id: string) => `https://www.youtube.com/shorts/${encodeURIComponent(id)}`;

/** Recherches lancées sur YouTube quand l'auteur ne donne pas de thème. */
export const RECHERCHES_PAR_DEFAUT = [
  'artisan trouver des clients',
  'artisan bâtiment conseils',
  'plombier chantier',
  'devis artisan',
  'rénovation avant après',
] as const;

/**
 * Reels Instagram les plus populaires d'un hashtag (API Instagram avec connexion Facebook) :
 * Instagram ne donne pas les vues des autres comptes, seulement j'aime et commentaires.
 */
export interface ReelInstagram {
  lien: string;
  legende: string;
  likes: number | null;
  commentaires: number;
  publieeLe: string;
  hashtag: string;
}

/** Hashtags suivis (30 hashtags différents par 7 jours au plus chez Instagram ; gardés 7 jours). */
export const HASHTAGS_INSTAGRAM = [
  'artisan',
  'artisanfrancais',
  'renovation',
  'btp',
  'chantier',
] as const;

/** Classés par interactions par jour (j'aime + commentaires × 3, un commentaire vaut plus). */
export function classerReels(
  reels: readonly ReelInstagram[],
  maintenant: number,
): (ReelInstagram & { interactionsParJour: number })[] {
  const vus = new Set<string>();
  return reels
    .filter((r) => !vus.has(r.lien) && vus.add(r.lien))
    .map((r) => {
      const jours = Math.max(1, (maintenant - Date.parse(r.publieeLe)) / 86_400_000);
      return { ...r, interactionsParJour: ((r.likes ?? 0) + r.commentaires * 3) / jours };
    })
    .sort((a, b) => b.interactionsParJour - a.interactionsParJour);
}
