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
