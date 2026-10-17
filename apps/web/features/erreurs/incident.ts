/**
 * Identifiant d'incident lisible (« PH-ERR-7f3a9c21 »), dérivé du digest Next.js quand il existe :
 * le même digest figure dans les journaux serveur et dans l'événement Sentry.
 */
export function identifiantIncident(
  digest: string | undefined,
  aleatoire: () => string = () => crypto.randomUUID(),
): string {
  const source = (digest ?? aleatoire()).replace(/[^0-9a-z]/gi, '').toLowerCase();
  return `PH-ERR-${source.slice(0, 8).padEnd(8, '0')}`;
}
