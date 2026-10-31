/** Protection CSRF des routes qui posent un cookie : l'en-tête Origin doit être celui du site. */
export function memeOrigine(requete: Request): boolean {
  const origine = requete.headers.get('origin');
  const hote = requete.headers.get('x-forwarded-host') ?? requete.headers.get('host');
  if (!origine || !hote) return false;
  try {
    return new URL(origine).host === hote;
  } catch {
    return false;
  }
}
