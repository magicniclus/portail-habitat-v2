import type { Reseau } from '@ph/core/studio';

/**
 * Envoi d'une vidéo finie sur un réseau (STUDIO.md §11), avec le jeton du compte connecté.
 * - YouTube : envoi « reprenable » (une demande, puis les octets) ;
 * - Instagram : conteneur Reels à partir d'une adresse signée de la vidéo, attente, publication ;
 * - TikTok : envoi du fichier par morceaux, puis suivi jusqu'à la mise en ligne.
 */
export interface VideoAPublier {
  octets: Uint8Array<ArrayBuffer>;
  /** Adresse signée, lisible quelques heures (Instagram vient chercher la vidéo). */
  url: string;
  titre: string;
  legende: string;
  /** Image de la vidéo pour la couverture Instagram, en ms. */
  couvertureMs: number;
}

export interface Publie {
  idExterne: string;
  lien: string | null;
  /** Mise en ligne en privé seulement (application TikTok pas encore validée). */
  prive: boolean;
}

export interface OutilsPublication {
  fetch: typeof fetch;
  /** Pause entre deux vérifications (remplacée dans les tests). */
  attendre: (ms: number) => Promise<void>;
}

async function lire<T>(r: Response, quoi: string): Promise<T> {
  if (!r.ok) {
    const texte = await r.text().catch(() => '');
    throw new Error(`${quoi} : refus (${r.status}) ${texte.slice(0, 200)}`);
  }
  return (await r.json()) as T;
}

async function youtube(o: OutilsPublication, jeton: string, v: VideoAPublier): Promise<Publie> {
  const debut = await o.fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${jeton}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'video/mp4',
        'x-upload-content-length': String(v.octets.byteLength),
      },
      body: JSON.stringify({
        snippet: { title: v.titre.slice(0, 100), description: v.legende, categoryId: '26' },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!debut.ok) throw new Error(`YouTube : envoi refusé (${debut.status}).`);
  const adresse = debut.headers.get('location');
  if (!adresse) throw new Error('YouTube : adresse d’envoi absente.');
  const fin = await lire<{ id?: string }>(
    await o.fetch(adresse, {
      method: 'PUT',
      headers: { 'content-type': 'video/mp4' },
      body: v.octets,
      signal: AbortSignal.timeout(10 * 60_000),
    }),
    'YouTube',
  );
  if (!fin.id) throw new Error('YouTube : identifiant de la vidéo absent.');
  return { idExterne: fin.id, lien: `https://www.youtube.com/shorts/${fin.id}`, prive: false };
}

const GRAPH = 'https://graph.instagram.com/v21.0';

async function instagram(
  o: OutilsPublication,
  jeton: string,
  compteId: string,
  v: VideoAPublier,
): Promise<Publie> {
  const conteneur = await lire<{ id?: string }>(
    await o.fetch(`${GRAPH}/${compteId}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}` },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: v.url,
        caption: v.legende,
        thumb_offset: v.couvertureMs,
        share_to_feed: true,
      }),
      signal: AbortSignal.timeout(30_000),
    }),
    'Instagram',
  );
  if (!conteneur.id) throw new Error('Instagram : conteneur absent.');
  // Instagram télécharge et prépare la vidéo : jusqu'à 5 minutes.
  for (let i = 0; ; i++) {
    const etat = await lire<{ status_code?: string }>(
      await o.fetch(`${GRAPH}/${conteneur.id}?fields=status_code`, {
        headers: { authorization: `Bearer ${jeton}` },
        signal: AbortSignal.timeout(15_000),
      }),
      'Instagram',
    );
    if (etat.status_code === 'FINISHED') break;
    if (etat.status_code === 'ERROR' || etat.status_code === 'EXPIRED')
      throw new Error(`Instagram : vidéo refusée (${etat.status_code}).`);
    if (i >= 30) throw new Error('Instagram : vidéo toujours en préparation après 5 minutes.');
    await o.attendre(10_000);
  }
  const pub = await lire<{ id?: string }>(
    await o.fetch(`${GRAPH}/${compteId}/media_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ creation_id: conteneur.id }),
      signal: AbortSignal.timeout(30_000),
    }),
    'Instagram',
  );
  if (!pub.id) throw new Error('Instagram : publication absente.');
  const lien = await o
    .fetch(`${GRAPH}/${pub.id}?fields=permalink`, {
      headers: { authorization: `Bearer ${jeton}` },
      signal: AbortSignal.timeout(15_000),
    })
    .then((r) => (r.ok ? (r.json() as Promise<{ permalink?: string }>) : {}))
    .then((x: { permalink?: string }) => x.permalink ?? null)
    .catch(() => null);
  return { idExterne: pub.id, lien, prive: false };
}

const TIKTOK = 'https://open.tiktokapis.com/v2';
/** Morceaux de 20 Mo ; le dernier prend le reste (TikTok accepte jusqu'à 128 Mo pour lui). */
const MORCEAU_TIKTOK = 20 * 1024 * 1024;

export function morceauxTiktok(taille: number): { debut: number; fin: number }[] {
  if (taille <= 64 * 1024 * 1024) return [{ debut: 0, fin: taille }];
  const n = Math.floor(taille / MORCEAU_TIKTOK);
  return Array.from({ length: n }, (_, i) => ({
    debut: i * MORCEAU_TIKTOK,
    fin: i === n - 1 ? taille : (i + 1) * MORCEAU_TIKTOK,
  }));
}

async function tiktok(o: OutilsPublication, jeton: string, v: VideoAPublier): Promise<Publie> {
  const entetes = {
    authorization: `Bearer ${jeton}`,
    'content-type': 'application/json; charset=UTF-8',
  };
  const createur = await lire<{ data?: { privacy_level_options?: string[] } }>(
    await o.fetch(`${TIKTOK}/post/publish/creator_info/query/`, {
      method: 'POST',
      headers: entetes,
      signal: AbortSignal.timeout(15_000),
    }),
    'TikTok',
  );
  const options = createur.data?.privacy_level_options ?? [];
  const prive = !options.includes('PUBLIC_TO_EVERYONE');
  const morceaux = morceauxTiktok(v.octets.byteLength);
  const init = await lire<{ data?: { upload_url?: string; publish_id?: string } }>(
    await o.fetch(`${TIKTOK}/post/publish/video/init/`, {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify({
        post_info: {
          title: v.legende.slice(0, 2_200),
          privacy_level: prive ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
          video_cover_timestamp_ms: v.couvertureMs,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: v.octets.byteLength,
          chunk_size: morceaux.length === 1 ? v.octets.byteLength : MORCEAU_TIKTOK,
          total_chunk_count: morceaux.length,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }),
    'TikTok',
  );
  const adresse = init.data?.upload_url;
  const publication = init.data?.publish_id;
  if (!adresse || !publication) throw new Error('TikTok : adresse d’envoi absente.');
  for (const m of morceaux) {
    const r = await o.fetch(adresse, {
      method: 'PUT',
      headers: {
        'content-type': 'video/mp4',
        'content-range': `bytes ${m.debut}-${m.fin - 1}/${v.octets.byteLength}`,
      },
      body: v.octets.subarray(m.debut, m.fin),
      signal: AbortSignal.timeout(5 * 60_000),
    });
    if (!r.ok) throw new Error(`TikTok : envoi refusé (${r.status}).`);
  }
  for (let i = 0; ; i++) {
    const s = await lire<{
      data?: {
        status?: string;
        fail_reason?: string;
        publicaly_available_post_id?: (string | number)[];
      };
    }>(
      await o.fetch(`${TIKTOK}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: entetes,
        body: JSON.stringify({ publish_id: publication }),
        signal: AbortSignal.timeout(15_000),
      }),
      'TikTok',
    );
    const statut = s.data?.status;
    if (statut === 'PUBLISH_COMPLETE') {
      const id = s.data?.publicaly_available_post_id?.[0];
      return {
        idExterne: id ? String(id) : publication,
        lien: id ? `https://www.tiktok.com/video/${id}` : null,
        prive,
      };
    }
    if (statut === 'FAILED')
      throw new Error(`TikTok : vidéo refusée (${s.data?.fail_reason ?? '?'}).`);
    // Vidéo privée : TikTok n'attribue pas d'identifiant public ; envoyée suffit.
    if (prive && statut === 'SEND_TO_USER_INBOX')
      return { idExterne: publication, lien: null, prive };
    if (i >= 30) throw new Error('TikTok : toujours en traitement après 5 minutes.');
    await o.attendre(10_000);
  }
}

export function publierSurReseau(
  o: OutilsPublication,
  reseau: Reseau,
  acces: { jeton: string; compteId: string },
  v: VideoAPublier,
): Promise<Publie> {
  if (reseau === 'youtube') return youtube(o, acces.jeton, v);
  if (reseau === 'instagram') return instagram(o, acces.jeton, acces.compteId, v);
  return tiktok(o, acces.jeton, v);
}
