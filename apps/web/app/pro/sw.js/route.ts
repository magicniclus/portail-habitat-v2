import { sourceServiceWorker } from '@/features/pwa/serviceWorker';

export const dynamic = 'force-static';

/**
 * En développement : service worker « autodestructeur ». Le navigateur revérifie `sw.js` à
 * chaque navigation ; celui-ci remplace l'ancien, vide ses caches, se retire et recharge les
 * onglets, sans avoir à forcer le rechargement (l'ancien servait l'ancien rendu).
 */
const AUTODESTRUCTION = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  await Promise.all((await caches.keys()).map((c) => caches.delete(c)));
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));`;

/** Service worker de l'espace pro (portée `/pro/`), jamais mis en cache par le navigateur. */
export function GET() {
  const source = process.env.NODE_ENV === 'development' ? AUTODESTRUCTION : sourceServiceWorker();
  return new Response(source, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-cache',
      'service-worker-allowed': '/pro/',
    },
  });
}
