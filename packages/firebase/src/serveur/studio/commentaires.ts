import { ErreurMetier } from '@ph/core/erreurs';
import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../../chemins';
import { jetonReseauStudio, type ConfigReseaux } from './comptes';
import { versPublication } from './publications';

/**
 * Commentaires sous nos vidéos (STUDIO.md §14), pour en faire des vidéos « réponse ». YouTube et
 * Instagram (TikTok n'ouvre pas les commentaires aux applications). On ne garde que le texte :
 * ni nom, ni photo, ni identifiant de l'auteur. Rien n'est enregistré en base.
 */
export interface Commentaire {
  texte: string;
  likes: number;
  video: string;
}

const JOUR = 86_400_000;

/** Une question ou une objection : point d'interrogation ou tournure de doute. */
const estQuestion = (t: string) =>
  /\?|\b(comment|combien|pourquoi|est-ce|c'est quoi|ça marche|vraiment|arnaque|payant|gratuit)\b/i.test(
    t,
  );

export async function commentairesRecents(
  db: Firestore,
  c: ConfigReseaux,
  f: typeof fetch,
  maintenant: number,
): Promise<Commentaire[]> {
  const q = await db
    .collection(collections.studioPublications)
    .where('publieeLe', '>=', Timestamp.fromMillis(maintenant - 60 * JOUR))
    .limit(100)
    .get();
  const pubs = q.docs
    .map((d) => versPublication(d.id, d.data()))
    .filter((p) => p.statut === 'publiee' && p.idExterne && p.reseau !== 'tiktok');
  const jetons = {
    youtube: pubs.some((p) => p.reseau === 'youtube')
      ? await jetonReseauStudio(db, c, 'youtube')
      : null,
    instagram: pubs.some((p) => p.reseau === 'instagram')
      ? await jetonReseauStudio(db, c, 'instagram')
      : null,
  };
  const lots = await Promise.all(
    pubs.slice(0, 40).map(async (p): Promise<Commentaire[]> => {
      try {
        if (p.reseau === 'youtube' && jetons.youtube) {
          const r = await f(
            `https://www.googleapis.com/youtube/v3/commentThreads?${new URLSearchParams({ part: 'snippet', videoId: p.idExterne!, maxResults: '50', order: 'relevance', textFormat: 'plainText' })}`,
            {
              headers: { authorization: `Bearer ${jetons.youtube.jeton}` },
              signal: AbortSignal.timeout(10_000),
            },
          );
          if (!r.ok) return [];
          const d = (await r.json()) as {
            items?: {
              snippet?: {
                topLevelComment?: { snippet?: { textDisplay?: string; likeCount?: number } };
              };
            }[];
          };
          return (d.items ?? []).flatMap((i) => {
            const s = i.snippet?.topLevelComment?.snippet;
            return s?.textDisplay
              ? [{ texte: s.textDisplay, likes: s.likeCount ?? 0, video: p.titre }]
              : [];
          });
        }
        if (p.reseau === 'instagram' && jetons.instagram) {
          const r = await f(
            `https://graph.instagram.com/v21.0/${p.idExterne}/comments?fields=text,like_count&limit=50`,
            {
              headers: { authorization: `Bearer ${jetons.instagram.jeton}` },
              signal: AbortSignal.timeout(10_000),
            },
          );
          if (!r.ok) return [];
          const d = (await r.json()) as { data?: { text?: string; like_count?: number }[] };
          return (d.data ?? []).flatMap((x) =>
            x.text ? [{ texte: x.text, likes: x.like_count ?? 0, video: p.titre }] : [],
          );
        }
      } catch {
        return [];
      }
      return [];
    }),
  );
  const vus = new Set<string>();
  return lots
    .flat()
    .map((x) => ({ ...x, texte: x.texte.trim().slice(0, 300) }))
    .filter((x) => x.texte.length >= 8 && estQuestion(x.texte))
    .filter((x) => !vus.has(x.texte.toLowerCase()) && vus.add(x.texte.toLowerCase()))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 80);
}

export function exigerCommentaires(l: Commentaire[]): Commentaire[] {
  if (!l.length)
    throw new ErreurMetier(
      'PRECONDITION',
      'Aucune question dans les commentaires de vos vidéos publiées depuis 60 jours (YouTube et Instagram).',
    );
  return l;
}
