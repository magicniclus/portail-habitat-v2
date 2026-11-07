import { z } from '@ph/core/zod';
import { demandesEstimees } from '@/server/statsDemandes';

const requete = z.object({
  cp: z.string().regex(/^\d{5}$/),
  metiers: z
    .string()
    .max(200)
    .default('')
    .transform((s) =>
      s
        .split(',')
        .filter((m) => /^[a-z0-9-]{1,40}$/.test(m))
        .slice(0, 5),
    ),
  rayon: z.coerce
    .number()
    .pipe(z.union([z.literal(30), z.literal(50), z.literal(100)]))
    .catch(30),
});

/**
 * `/api/stats/demandes?cp=&metiers=&rayon=` (STATS_DEMANDES §4) : aucune donnée personnelle,
 * mis en cache 6 h par le CDN.
 */
export function GET(r: Request) {
  const p = requete.safeParse(Object.fromEntries(new URL(r.url).searchParams));
  if (!p.success)
    return Response.json({ total: null, parMetier: {}, source: 'modele' }, { status: 400 });
  const e = demandesEstimees({
    codePostal: p.data.cp,
    metiers: p.data.metiers,
    rayonKm: p.data.rayon,
  });
  return Response.json(
    { total: e.total, parMetier: e.parMetier, source: e.source },
    { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' } },
  );
}
