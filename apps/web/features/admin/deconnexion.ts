'use client';

import { oublierDonneesLocales } from '@/lib/donneesLocales';
import { fermerSessionFirebase } from '@/lib/firebaseClient';
import { routes } from '@/lib/routes';

/** Fin de session admin : cookie serveur effacé, connexion Firebase fermée, retour à la connexion. */
export async function deconnecterAdmin(raison?: 'inactivite', suite?: string) {
  await oublierDonneesLocales();
  await fetch('/api/session', { method: 'DELETE' }).catch(() => undefined);
  await fermerSessionFirebase();
  window.location.assign(routes.connexionAdminSuite(suite ?? window.location.pathname, raison));
}
