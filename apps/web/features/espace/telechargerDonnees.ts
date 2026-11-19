'use client';

import { telechargerFichier } from '@/lib/telecharger';
import { exporterDonnees } from './api';

/** Export RGPD enregistré par le navigateur (fichier JSON) ; renvoie le message d'erreur éventuel. */
export async function telechargerDonnees(): Promise<string | null> {
  const r = await exporterDonnees();
  if (!r.ok) return r.message;
  telechargerFichier(
    'mes-donnees-portail-travaux.json',
    new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }),
  );
  return null;
}
