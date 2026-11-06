/**
 * Réseaux où le Studio publie et relève les statistiques (STUDIO.md §10). Seules les adresses et
 * les droits demandés sont ici ; les jetons restent côté serveur, chiffrés.
 */
export const NOMS_RESEAUX = ['youtube', 'instagram', 'tiktok'] as const;
export type Reseau = (typeof NOMS_RESEAUX)[number];

interface DefinitionReseau {
  libelle: string;
  /** Variables d'environnement de l'application créée chez le réseau. */
  variables: { id: string; secret: string };
  autorisation: string;
  jeton: string;
  droits: readonly string[];
  /** Séparateur des droits dans l'adresse d'autorisation. */
  separateur: ' ' | ',';
  /** Ce que le propriétaire doit faire chez le réseau avant de connecter. */
  prealable: string;
  /** Légende : nombre de caractères au plus. */
  legendeMax: number;
}

export const RESEAUX: Record<Reseau, DefinitionReseau> = {
  youtube: {
    libelle: 'YouTube Shorts',
    variables: { id: 'GOOGLE_OAUTH_CLIENT_ID', secret: 'GOOGLE_OAUTH_CLIENT_SECRET' },
    autorisation: 'https://accounts.google.com/o/oauth2/v2/auth',
    jeton: 'https://oauth2.googleapis.com/token',
    droits: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ],
    separateur: ' ',
    prealable:
      'Console Google Cloud : activer YouTube Data API v3 et YouTube Analytics API, créer un identifiant OAuth « Application Web ».',
    legendeMax: 5_000,
  },
  instagram: {
    libelle: 'Instagram Reels',
    variables: { id: 'INSTAGRAM_APP_ID', secret: 'INSTAGRAM_APP_SECRET' },
    autorisation: 'https://www.instagram.com/oauth/authorize',
    jeton: 'https://api.instagram.com/oauth/access_token',
    droits: [
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
      'instagram_business_manage_comments',
    ],
    separateur: ',',
    prealable:
      'Compte Instagram professionnel, puis une application Meta (produit « API Instagram avec connexion Instagram »).',
    legendeMax: 2_200,
  },
  tiktok: {
    libelle: 'TikTok',
    variables: { id: 'TIKTOK_CLIENT_KEY', secret: 'TIKTOK_CLIENT_SECRET' },
    autorisation: 'https://www.tiktok.com/v2/auth/authorize/',
    jeton: 'https://open.tiktokapis.com/v2/oauth/token/',
    droits: ['user.info.basic', 'video.publish', 'video.upload', 'video.list'],
    separateur: ',',
    prealable:
      'Application TikTok for Developers avec « Content Posting API » et « Display API ». Tant que TikTok n’a pas validé l’application, les vidéos publiées restent privées.',
    legendeMax: 2_200,
  },
};

/** Adresse où envoyer l'auteur pour autoriser le Studio sur un réseau. */
export function urlAutorisation(
  reseau: Reseau,
  o: { clientId: string; redirection: string; etat: string },
): string {
  const d = RESEAUX[reseau];
  const p = new URLSearchParams({
    [reseau === 'tiktok' ? 'client_key' : 'client_id']: o.clientId,
    redirect_uri: o.redirection,
    response_type: 'code',
    scope: d.droits.join(d.separateur),
    state: o.etat,
    ...(reseau === 'youtube'
      ? { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' }
      : {}),
  });
  return `${d.autorisation}?${p}`;
}

/** Légende adaptée au réseau : hashtags à la fin, coupée proprement à la limite. */
export function legendeReseau(
  reseau: Reseau,
  o: { texte: string; hashtags: readonly string[] },
): string {
  const max = RESEAUX[reseau].legendeMax;
  // YouTube affiche mieux 3 hashtags au plus ; Instagram en accepte 30, TikTok sans limite stricte.
  const n = reseau === 'youtube' ? 3 : reseau === 'instagram' ? 30 : 10;
  const tags = o.hashtags
    .map((h) => (h.startsWith('#') ? h : `#${h}`).replace(/\s+/g, ''))
    .slice(0, n)
    .join(' ');
  const corps = o.texte.trim();
  const complet = tags ? `${corps}\n\n${tags}` : corps;
  if (complet.length <= max) return complet;
  const place = max - (tags ? tags.length + 2 : 0);
  return `${corps.slice(0, Math.max(0, place - 1)).trimEnd()}…${tags ? `\n\n${tags}` : ''}`;
}
