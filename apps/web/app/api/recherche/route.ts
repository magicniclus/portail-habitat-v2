import { normaliser } from '@ph/core/recherche';
import { projetsPopulaires, rechercherProjets } from '@/server/recherche';

const MAX = 7;
const LIMITE_PAR_MINUTE = 30;

// Limite de débit par instance (meilleur effort) : le cache CDN d'une heure absorbe l'essentiel du trafic.
const compteurs = new Map<string, { debut: number; n: number }>();
function autorise(ip: string, maintenant: number): boolean {
  const c = compteurs.get(ip);
  if (!c || maintenant - c.debut >= 60_000) {
    if (compteurs.size > 10_000) compteurs.clear();
    compteurs.set(ip, { debut: maintenant, n: 1 });
    return true;
  }
  c.n += 1;
  return c.n <= LIMITE_PAR_MINUTE;
}

/** `GET /api/recherche?q=` (RECHERCHE §4) : suggestions de projets, mises en cache 1 h par requête. */
export async function GET(requete: Request) {
  const ip = requete.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
  if (!autorise(ip, Date.now())) {
    return Response.json(
      { ok: false, code: 'TROP_DE_REQUETES' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }
  const q = (new URL(requete.url).searchParams.get('q') ?? '').slice(0, 120);
  const cache = {
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  };
  if (normaliser(q).length < 2) {
    return Response.json(
      { ok: true, data: { populaires: projetsPopulaires() } },
      { headers: cache },
    );
  }
  return Response.json({ ok: true, data: await rechercherProjets(q, MAX) }, { headers: cache });
}
