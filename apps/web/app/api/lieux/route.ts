import { z } from '@ph/core/zod';

const requete = z.object({ q: z.string().trim().min(2).max(60) });

/**
 * Communes pour l'étape « zone » (API Découpage administratif, gratuite) : nom, code postal,
 * centre. Réponse mise en cache 1 jour ; aucune donnée personnelle.
 */
export async function GET(r: Request) {
  const p = requete.safeParse(Object.fromEntries(new URL(r.url).searchParams));
  if (!p.success) return Response.json({ lieux: [] });
  const q = p.data.q;
  const param = /^\d{5}$/.test(q) ? `codePostal=${q}` : `nom=${encodeURIComponent(q)}`;
  try {
    const rep = await fetch(
      `https://geo.api.gouv.fr/communes?${param}&fields=nom,centre,codesPostaux&boost=population&limit=6`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(2000) },
    );
    const communes = rep.ok
      ? ((await rep.json()) as {
          nom: string;
          codesPostaux: string[];
          centre: { coordinates: [number, number] };
        }[])
      : [];
    return Response.json(
      {
        lieux: communes.map((c) => ({
          nom: c.nom,
          codePostal: c.codesPostaux[0] ?? '',
          centre: { latitude: c.centre.coordinates[1], longitude: c.centre.coordinates[0] },
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400' } },
    );
  } catch {
    return Response.json({ lieux: [] });
  }
}
