'use client';

import { authClient } from '@/lib/firebaseClient';
import { routes } from '@/lib/routes';

/** Fin de session admin : cookie serveur effacé, connexion Firebase fermée, retour à la connexion. */
export async function deconnecterAdmin(raison?: 'inactivite', suite?: string) {
  await fetch('/api/session', { method: 'DELETE' }).catch(() => undefined);
  await (await authClient()).signOut().catch(() => undefined);
  window.location.assign(routes.connexionAdminSuite(suite ?? window.location.pathname, raison));
}
