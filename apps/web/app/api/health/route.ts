export const dynamic = 'force-dynamic';

/** Sonde de disponibilité (supervision, EXPLOITATION §3). Aucune donnée sensible. */
export function GET() {
  return Response.json(
    {
      statut: 'ok',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      horodatage: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
