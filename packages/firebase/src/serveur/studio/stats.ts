import { meilleuresHeures, resumeVosVideos, RESEAUX, type Reseau } from '@ph/core/studio';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { chemins, collections } from '../../chemins';
import { jetonReseauStudio, type ConfigReseaux } from './comptes';
import { versPublication, type PublicationStudio, type StatsPublication } from './publications';

/**
 * Statistiques de vos vidéos (STUDIO.md §12), relevées toutes les 6 h pendant 30 jours après la
 * publication par la Function `studioStats` :
 * - YouTube : vues, j'aime, commentaires (Data API), durée regardée, abonnés gagnés et courbe de
 *   rétention (Analytics API) ;
 * - Instagram : vues, j'aime, commentaires, partages, durée moyenne regardée (insights) ;
 * - TikTok : vues, j'aime, commentaires, partages (Display API ; pas de rétention ouverte).
 */
export interface ServicesStats {
  db: Firestore;
  horloge: () => number;
  reseaux: ConfigReseaux | null;
  fetch: typeof fetch;
}

const JOUR = 86_400_000;
const SUIVI_MS = 30 * JOUR;
const INTERVALLE_MS = 6 * 3_600_000;

const nombre = (x: unknown) => (x === undefined || x === null || x === '' ? null : Number(x));

async function lire<T>(r: Response, quoi: string): Promise<T> {
  if (!r.ok) throw new Error(`${quoi} : refus (${r.status}).`);
  return (await r.json()) as T;
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function youtube(
  s: ServicesStats,
  jeton: string,
  p: PublicationStudio,
): Promise<StatsPublication> {
  const h = { authorization: `Bearer ${jeton}` };
  const v = await lire<{
    items?: { statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }[];
  }>(
    await s.fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${p.idExterne}`,
      {
        headers: h,
        signal: AbortSignal.timeout(10_000),
      },
    ),
    'YouTube',
  );
  const st = v.items?.[0]?.statistics ?? {};
  const periode = {
    ids: 'channel==MINE',
    startDate: iso(p.publieeLe ?? s.horloge()),
    endDate: iso(s.horloge()),
    filters: `video==${p.idExterne}`,
  };
  // Analytics : chiffres consolidés avec 1 à 2 jours de retard ; absents au début, ce n'est pas une erreur.
  const a = await s
    .fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ ...periode, metrics: 'averageViewDuration,averageViewPercentage,subscribersGained,shares' })}`,
      { headers: h, signal: AbortSignal.timeout(10_000) },
    )
    .then((r) => (r.ok ? (r.json() as Promise<{ rows?: number[][] }>) : { rows: [] }))
    .catch(() => ({ rows: [] as number[][] }));
  const ligne = a.rows?.[0];
  const c = await s
    .fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ ...periode, metrics: 'audienceWatchRatio', dimensions: 'elapsedVideoTimeRatio' })}`,
      { headers: h, signal: AbortSignal.timeout(10_000) },
    )
    .then((r) => (r.ok ? (r.json() as Promise<{ rows?: number[][] }>) : { rows: [] }))
    .catch(() => ({ rows: [] as number[][] }));
  const courbe = (c.rows ?? []).map((x) => Math.round(Number(x[1]) * 1000) / 1000);
  return {
    vues: nombre(st.viewCount) ?? 0,
    likes: nombre(st.likeCount),
    commentaires: nombre(st.commentCount),
    partages: ligne ? nombre(ligne[3]) : null,
    dureeMoyenneS: ligne ? nombre(ligne[0]) : null,
    retention: ligne ? Math.min(1, (nombre(ligne[1]) ?? 0) / 100) : null,
    abonnesGagnes: ligne ? nombre(ligne[2]) : null,
    courbe: courbe.length >= 10 ? courbe : null,
  };
}

async function instagram(
  s: ServicesStats,
  jeton: string,
  p: PublicationStudio,
  dureeS: number,
): Promise<StatsPublication> {
  const r = await lire<{ data?: { name?: string; values?: { value?: number }[] }[] }>(
    await s.fetch(
      `https://graph.instagram.com/v21.0/${p.idExterne}/insights?metric=views,likes,comments,shares,ig_reels_avg_watch_time`,
      { headers: { authorization: `Bearer ${jeton}` }, signal: AbortSignal.timeout(10_000) },
    ),
    'Instagram',
  );
  const m = (n: string) => r.data?.find((x) => x.name === n)?.values?.[0]?.value ?? null;
  const moyenneMs = m('ig_reels_avg_watch_time');
  return {
    vues: m('views') ?? 0,
    likes: m('likes'),
    commentaires: m('comments'),
    partages: m('shares'),
    dureeMoyenneS: moyenneMs !== null ? Math.round(moyenneMs / 100) / 10 : null,
    retention: moyenneMs !== null && dureeS > 0 ? Math.min(1, moyenneMs / 1000 / dureeS) : null,
    abonnesGagnes: null,
    courbe: null,
  };
}

async function tiktok(
  s: ServicesStats,
  jeton: string,
  p: PublicationStudio,
): Promise<StatsPublication> {
  const r = await lire<{
    data?: {
      videos?: {
        id?: string;
        view_count?: number;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
      }[];
    };
  }>(
    await s.fetch(
      'https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count',
      {
        method: 'POST',
        headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' },
        body: JSON.stringify({ filters: { video_ids: [p.idExterne] } }),
        signal: AbortSignal.timeout(10_000),
      },
    ),
    'TikTok',
  );
  const v = r.data?.videos?.[0];
  return {
    vues: v?.view_count ?? 0,
    likes: v?.like_count ?? null,
    commentaires: v?.comment_count ?? null,
    partages: v?.share_count ?? null,
    dureeMoyenneS: null,
    retention: null,
    abonnesGagnes: null,
    courbe: null,
  };
}

/** Relève les statistiques des vidéos publiées depuis moins de 30 jours (toutes les 6 h). */
export async function releverStatsStudio(
  s: ServicesStats,
): Promise<{ relevees: number; erreurs: number }> {
  const maintenant = s.horloge();
  const q = await s.db
    .collection(collections.studioPublications)
    .where('publieeLe', '>=', Timestamp.fromMillis(maintenant - SUIVI_MS))
    .limit(300)
    .get();
  const aFaire = q.docs
    .map((d) => ({ d, p: versPublication(d.id, d.data()) }))
    .filter(({ p }) => p.statut === 'publiee' && p.idExterne && !p.prive)
    .filter(({ p }) => !p.statsLe || maintenant - p.statsLe >= INTERVALLE_MS - 60_000);
  const jetons = new Map<Reseau, { jeton: string } | null>();
  let relevees = 0;
  let erreurs = 0;
  for (const { d, p } of aFaire) {
    try {
      if (!s.reseaux) throw new Error('STUDIO_CHIFFREMENT_CLE manquante.');
      if (!jetons.has(p.reseau))
        jetons.set(p.reseau, await jetonReseauStudio(s.db, s.reseaux, p.reseau));
      const acces = jetons.get(p.reseau);
      if (!acces) continue;
      const projet = await s.db.doc(chemins.projetStudio(p.projetId)).get();
      const dureeS = ((projet.get('rendu.dureeMs') as number | undefined) ?? 0) / 1000;
      const stats =
        p.reseau === 'youtube'
          ? await youtube(s, acces.jeton, p)
          : p.reseau === 'instagram'
            ? await instagram(s, acces.jeton, p, dureeS)
            : await tiktok(s, acces.jeton, p);
      await d.ref.update({ stats, statsLe: Timestamp.fromMillis(maintenant), erreurStats: null });
      relevees++;
    } catch (e) {
      await d.ref.update({
        statsLe: Timestamp.fromMillis(maintenant),
        erreurStats: (e instanceof Error ? e.message : 'Erreur').slice(0, 200),
      });
      erreurs++;
    }
  }
  return { relevees, erreurs };
}

async function publiees(db: Firestore, depuis: number): Promise<PublicationStudio[]> {
  const q = await db
    .collection(collections.studioPublications)
    .where('publieeLe', '>=', Timestamp.fromMillis(depuis))
    .limit(500)
    .get();
  return q.docs
    .map((d) => versPublication(d.id, d.data()))
    .filter((p) => p.statut === 'publiee' && p.stats);
}

const heureParis = (ms: number) =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(ms),
  );

/** Heures de publication qui ont le mieux marché sur 60 jours (vues), pour le calendrier. */
export async function meilleuresHeuresStudio(db: Firestore, maintenant: number): Promise<number[]> {
  const l = await publiees(db, maintenant - 60 * JOUR);
  return meilleuresHeures(
    l.map((p) => ({ heure: heureParis(p.publieeLe!), score: p.stats!.vues })),
  );
}

/** Résumé des résultats réels de vos vidéos (90 jours), donné à Claude pour les sujets. */
export async function resultatsPourClaudeStudio(
  db: Firestore,
  maintenant: number,
): Promise<string> {
  const l = await publiees(db, maintenant - 90 * JOUR);
  if (!l.length) return '';
  const accroches = new Map<string, string | null>();
  for (const id of new Set(l.map((p) => p.projetId))) {
    const d = await db.doc(chemins.projetStudio(id)).get();
    accroches.set(id, (d.get('sujet.accroches') as string[] | undefined)?.[0] ?? null);
  }
  return resumeVosVideos(
    l.map((p) => ({
      titre: p.titre,
      reseau: RESEAUX[p.reseau].libelle,
      vues: p.stats!.vues,
      retention: p.stats!.retention,
      abonnesGagnes: p.stats!.abonnesGagnes,
      accroche: p.variante ? null : (accroches.get(p.projetId) ?? null),
    })),
  );
}

/** Vidéos publiées depuis 90 jours avec leurs résultats et la durée de la vidéo (page Résultats). */
export async function resultatsStudio(
  db: Firestore,
  maintenant: number,
): Promise<(PublicationStudio & { dureeS: number })[]> {
  const l = await publiees(db, maintenant - 90 * JOUR);
  const durees = new Map<string, number>();
  for (const id of new Set(l.map((p) => p.projetId))) {
    const d = await db.doc(chemins.projetStudio(id)).get();
    durees.set(id, ((d.get('rendu.dureeMs') as number | undefined) ?? 0) / 1000);
  }
  return l
    .map((p) => ({ ...p, dureeS: durees.get(p.projetId) ?? 0 }))
    .sort((a, b) => b.stats!.vues - a.stats!.vues);
}
