/**
 * Jetons de partage retirés des URL envoyées à Sentry (lien /plan/{jeton}, DES-42) : un jeton
 * donne accès au plan, il ne doit apparaître ni dans les erreurs ni dans le fil d'événements.
 */
export const masquerJetons = (texte: string) =>
  texte.replace(/\/plan\/[A-Za-z0-9_-]+/g, '/plan/[jeton]');

type Evenement = {
  request?: { url?: string };
  transaction?: string;
  breadcrumbs?: { data?: Record<string, unknown>; message?: string }[];
};

/** `beforeSend` de Sentry : URL, transaction et fil d'événements nettoyés. */
export function filtrerEvenement<E extends Evenement>(e: E): E {
  if (e.request?.url) e.request.url = masquerJetons(e.request.url);
  if (e.transaction) e.transaction = masquerJetons(e.transaction);
  for (const b of e.breadcrumbs ?? []) {
    if (b.message) b.message = masquerJetons(b.message);
    for (const k of ['url', 'from', 'to'])
      if (typeof b.data?.[k] === 'string') b.data[k] = masquerJetons(b.data[k]);
  }
  return e;
}
