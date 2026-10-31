import { manifestPro } from '@/features/pwa/manifest';

export const dynamic = 'force-static';

/** Manifest de l'application pro installable (MOB-06). */
export function GET() {
  return new Response(JSON.stringify(manifestPro()), {
    headers: { 'content-type': 'application/manifest+json; charset=utf-8' },
  });
}
