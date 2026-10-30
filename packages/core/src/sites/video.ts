/**
 * Identifiant d'une vidéo YouTube depuis le lien collé par l'artisan : watch?v=, youtu.be,
 * shorts, live, embed, mobile, youtube-nocookie ; `null` si ce n'est pas une vidéo YouTube.
 */
export function idYoutube(lien: string | undefined): string | null {
  if (!lien) return null;
  let u: URL;
  try {
    u = new URL(lien.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const hote = u.hostname.replace(/^(www|m|music)\./, '');
  const id =
    hote === 'youtu.be'
      ? u.pathname.slice(1)
      : hote === 'youtube.com' || hote === 'youtube-nocookie.com'
        ? (u.searchParams.get('v') ?? /^\/(?:shorts|live|embed|v)\/([^/?#]+)/.exec(u.pathname)?.[1])
        : null;
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

/** Début de lecture (secondes) lu dans le lien : `t=90`, `t=1m30s`, `start=90` ; 0 sinon. */
export function debutYoutube(lien: string | undefined): number {
  if (!lien) return 0;
  let u: URL;
  try {
    u = new URL(lien.trim());
  } catch {
    return 0;
  }
  const t = u.searchParams.get('t') ?? u.searchParams.get('start') ?? '';
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t);
  if (!t || !m) return 0;
  return Math.min(36000, Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0));
}

/** Lien YouTube canonique enregistré (identifiant et début). */
export const lienYoutube = (id: string, debut = 0) =>
  `https://www.youtube.com/watch?v=${id}${debut > 0 ? `&t=${debut}` : ''}`;

/**
 * Lecteur intégré sans cookie (youtube-nocookie) : vidéos suggérées de la même chaîne seulement,
 * lecture dans la page sur mobile, début éventuel. Les publicités dépendent de la chaîne (aucune si
 * elle n'est pas monétisée) : YouTube ne permet pas de les couper autrement.
 */
export const integrationYoutube = (id: string, debut = 0) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${debut > 0 ? `&start=${debut}` : ''}`;
