import { dureeIso, type VideoBrute } from '@ph/core/studio';

/**
 * Vidéos courtes qui marchent sur YouTube (API YouTube Data v3, clé gratuite) : recherche en
 * France et en français, triée par vues, sur les 60 derniers jours, avec les abonnés de chaque
 * chaîne. Coût : 102 unités par recherche sur 10 000 par jour ; résultat gardé 24 h (COUTS.md).
 */
export type RechercheYoutube = (recherche: string, maintenant: number) => Promise<VideoBrute[]>;

interface ReponseRecherche {
  items?: { id?: { videoId?: string } }[];
}
interface ReponseVideos {
  items?: {
    snippet?: {
      title?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
      description?: string;
    };
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    contentDetails?: { duration?: string };
  }[];
}

interface ReponseChaines {
  items?: {
    id?: string;
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }[];
}

const API = 'https://www.googleapis.com/youtube/v3';
const entier = (x: string | undefined) => (x === undefined ? null : Number(x));

export function rechercheYoutube(cle: string, f: typeof fetch = fetch): RechercheYoutube {
  return async (recherche, maintenant) => {
    const depuis = new Date(maintenant - 60 * 86_400_000).toISOString();
    const p = new URLSearchParams({
      part: 'id',
      type: 'video',
      q: recherche,
      videoDuration: 'short',
      order: 'viewCount',
      regionCode: 'FR',
      relevanceLanguage: 'fr',
      publishedAfter: depuis,
      maxResults: '25',
      key: cle,
    });
    const r = await f(`${API}/search?${p}`, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`YouTube : recherche refusée (${r.status}).`);
    const ids = ((await r.json()) as ReponseRecherche).items
      ?.map((i) => i.id?.videoId)
      .filter((x): x is string => Boolean(x));
    if (!ids?.length) return [];
    const v = await f(
      `${API}/videos?${new URLSearchParams({ part: 'snippet,statistics,contentDetails', id: ids.join(','), key: cle })}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!v.ok) throw new Error(`YouTube : détails refusés (${v.status}).`);
    const items = ((await v.json()) as ReponseVideos).items ?? [];
    // Abonnés des chaînes (1 unité) : une vidéo qui dépasse son audience a « percé ».
    const chaines = [
      ...new Set(items.map((i) => i.snippet?.channelId).filter((x): x is string => Boolean(x))),
    ];
    const abonnes = new Map<string, number | null>();
    if (chaines.length) {
      const c = await f(
        `${API}/channels?${new URLSearchParams({ part: 'statistics', id: chaines.join(','), key: cle })}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (c.ok)
        for (const ch of ((await c.json()) as ReponseChaines).items ?? [])
          if (ch.id)
            abonnes.set(
              ch.id,
              ch.statistics?.hiddenSubscriberCount ? null : entier(ch.statistics?.subscriberCount),
            );
    }
    return items.map((i) => ({
      titre: i.snippet?.title ?? '',
      chaine: i.snippet?.channelTitle ?? '',
      publieeLe: i.snippet?.publishedAt ?? new Date(maintenant).toISOString(),
      description: (i.snippet?.description ?? '').slice(0, 300),
      vues: entier(i.statistics?.viewCount) ?? 0,
      likes: entier(i.statistics?.likeCount),
      commentaires: entier(i.statistics?.commentCount),
      dureeS: dureeIso(i.contentDetails?.duration ?? '') ?? 0,
      abonnes: abonnes.get(i.snippet?.channelId ?? '') ?? null,
    }));
  };
}
