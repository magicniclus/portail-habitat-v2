import { sourceServiceWorker } from '@/features/pwa/serviceWorker';

export const dynamic = 'force-static';

/** Service worker de l'espace pro (portée `/pro/`), jamais mis en cache par le navigateur. */
export function GET() {
  return new Response(sourceServiceWorker(), {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-cache',
      'service-worker-allowed': '/pro/',
    },
  });
}
