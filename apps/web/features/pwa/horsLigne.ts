'use client';

import { CACHES_PRO } from './serviceWorker';

/** Déconnexion : les pages gardées pour le mode hors ligne (données personnelles) sont effacées. */
export async function oublierPagesHorsLigne(): Promise<void> {
  if ('caches' in window) await caches.delete(CACHES_PRO.pages);
}
