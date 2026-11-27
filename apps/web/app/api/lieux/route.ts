import { z } from '@ph/core/zod';
import { chercherCommunes } from '@/server/lieux';

const requete = z.object({ q: z.string().trim().min(2).max(60) });

/**
 * Communes pour l'étape « zone » (API Découpage administratif, gratuite) : nom, code postal,
 * centre. Réponse mise en cache 1 jour ; aucune donnée personnelle.
 */
export async function GET(r: Request) {
  const p = requete.safeParse(Object.fromEntries(new URL(r.url).searchParams));
  if (!p.success) return Response.json({ lieux: [] });
  return Response.json(
    { lieux: await chercherCommunes(p.data.q) },
    { headers: { 'Cache-Control': 'public, s-maxage=86400' } },
  );
}
