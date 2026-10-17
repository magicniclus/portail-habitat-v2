'use client';

import { exporterDonnees } from './api';

/** Export RGPD enregistré par le navigateur (fichier JSON) ; renvoie le message d'erreur éventuel. */
export async function telechargerDonnees(): Promise<string | null> {
  const r = await exporterDonnees();
  if (!r.ok) return r.message;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }),
  );
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: 'mes-donnees-portail-habitat.json',
  });
  a.click();
  URL.revokeObjectURL(url);
  return null;
}
