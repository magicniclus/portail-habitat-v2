import { PWA_PRO } from './manifest';

/** Caches du service worker ; `pages` contient des données personnelles : vidé à la déconnexion. */
export const CACHES_PRO = { pages: 'ph-pro-pages-v1', statique: 'ph-pro-statique-v1' } as const;

/**
 * Service worker de l'espace pro (MOBILE §9) :
 * - pages de l'espace : réseau d'abord, copie gardée pour le mode hors ligne, sinon page « hors ligne » ;
 * - fichiers `/_next/static` (noms uniques) : cache d'abord ;
 * - push (message « data » FCM) : notification affichée, ouverture de la page au clic.
 * Jamais de cache pour `/api`, ni pour les autres méthodes que GET.
 */
export function sourceServiceWorker(): string {
  const c = JSON.stringify(CACHES_PRO);
  const p = JSON.stringify({
    portee: PWA_PRO.portee,
    horsLigne: PWA_PRO.horsLigne,
    icone: PWA_PRO.icone('192'),
  });
  return `'use strict';
const CACHES = ${c};
const PWA = ${p};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHES.pages).then((c) => c.add(PWA.horsLigne)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  const gardes = Object.values(CACHES);
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith('ph-pro-') && !gardes.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'vider') e.waitUntil(caches.delete(CACHES.pages));
});

async function reseauDabord(requete) {
  const cache = await caches.open(CACHES.pages);
  try {
    const r = await fetch(requete);
    if (r.ok && r.type === 'basic') cache.put(requete, r.clone());
    return r;
  } catch (err) {
    return (await cache.match(requete)) || (await cache.match(PWA.horsLigne)) || Response.error();
  }
}

async function cacheDabord(requete) {
  const cache = await caches.open(CACHES.statique);
  const trouve = await cache.match(requete);
  if (trouve) return trouve;
  const r = await fetch(requete);
  if (r.ok) cache.put(requete, r.clone());
  return r;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/static/')) return e.respondWith(cacheDabord(req));
  if (req.mode === 'navigate' && url.pathname.startsWith(PWA.portee)) e.respondWith(reseauDabord(req));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j; } catch (err) { d = {}; }
  const titre = d.titre || 'Portail Habitat Pro';
  e.waitUntil(self.registration.showNotification(titre, {
    body: d.corps || '',
    icon: PWA.icone,
    badge: PWA.icone,
    data: { lien: d.lien || PWA.portee },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const lien = new URL((e.notification.data && e.notification.data.lien) || PWA.portee, self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      const f = fenetres.find((w) => w.url.startsWith(self.location.origin + PWA.portee));
      if (f) return f.navigate(lien).then((x) => (x || f).focus());
      return self.clients.openWindow(lien);
    }),
  );
});
`;
}
