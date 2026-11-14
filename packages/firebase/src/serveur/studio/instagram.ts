import type { ReelInstagram } from '@ph/core/studio';

/**
 * Reels populaires d'un hashtag (STUDIO.md §1), par l'API Instagram avec connexion Facebook :
 * `INSTAGRAM_TENDANCES_JETON` (jeton d'un utilisateur Facebook lié à la page du compte pro) et
 * `INSTAGRAM_TENDANCES_COMPTE` (identifiant du compte Instagram pro). Exige la fonctionnalité
 * « Instagram Public Content Access » validée par Meta. 30 hashtags différents par 7 jours.
 */
export type RechercheInstagram = (hashtag: string) => Promise<ReelInstagram[]>;

const GRAPH = 'https://graph.facebook.com/v21.0';

export function rechercheInstagram(
  jeton: string,
  compteId: string,
  f: typeof fetch = fetch,
): RechercheInstagram {
  return async (hashtag) => {
    const lire = async <T>(url: string): Promise<T> => {
      const r = await f(url, { signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error(`Instagram : recherche refusée (${r.status}).`);
      return (await r.json()) as T;
    };
    const id = (
      await lire<{ data?: { id?: string }[] }>(
        `${GRAPH}/ig_hashtag_search?${new URLSearchParams({ user_id: compteId, q: hashtag, access_token: jeton })}`,
      )
    ).data?.[0]?.id;
    if (!id) return [];
    const m = await lire<{
      data?: {
        caption?: string;
        comments_count?: number;
        like_count?: number;
        media_type?: string;
        permalink?: string;
        timestamp?: string;
      }[];
    }>(
      `${GRAPH}/${id}/top_media?${new URLSearchParams({
        user_id: compteId,
        fields: 'caption,comments_count,like_count,media_type,permalink,timestamp',
        limit: '50',
        access_token: jeton,
      })}`,
    );
    return (m.data ?? [])
      .filter((x) => x.media_type === 'VIDEO' && x.permalink && x.timestamp)
      .map((x) => ({
        lien: x.permalink!,
        legende: (x.caption ?? '').slice(0, 300),
        likes: x.like_count ?? null,
        commentaires: x.comments_count ?? 0,
        publieeLe: x.timestamp!,
        hashtag,
      }));
  };
}
