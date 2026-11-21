import 'server-only';
import { COOKIE_CONNECTE } from '@ph/core/parcours';
import { estEmulateur } from '@ph/firebase/admin';
import { COOKIE_SESSION } from '@ph/firebase/serveur';
import { cookies } from 'next/headers';

/**
 * `Secure` en production, sauf sous émulateur (e2e sur http://localhost : WebKit y refuse les
 * cookies `Secure`, Chromium les accepte). L'émulateur n'est jamais configuré en ligne.
 */
export const cookieSecurise = () => process.env.NODE_ENV === 'production' && !estEmulateur();

/**
 * Ouvre la session : cookie Firebase httpOnly, plus un indicateur lisible par le navigateur (« 1 »,
 * aucune donnée personnelle) pour ne synchroniser les brouillons que si quelqu'un est connecté.
 */
export async function ouvrirSession(session: { cookie: string; dureeMs: number }) {
  const c = await cookies();
  const commun = {
    secure: cookieSecurise(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(session.dureeMs / 1000),
  };
  c.set(COOKIE_SESSION, session.cookie, { ...commun, httpOnly: true });
  c.set(COOKIE_CONNECTE, '1', { ...commun, httpOnly: false });
}

export async function fermerSession() {
  const c = await cookies();
  c.delete(COOKIE_SESSION);
  c.delete(COOKIE_CONNECTE);
}
