import 'server-only';
import { COOKIE_CONNECTE } from '@ph/core/parcours';
import { COOKIE_SESSION } from '@ph/firebase/serveur';
import { cookies } from 'next/headers';

/**
 * Ouvre la session : cookie Firebase httpOnly, plus un indicateur lisible par le navigateur (« 1 »,
 * aucune donnée personnelle) pour ne synchroniser les brouillons que si quelqu'un est connecté.
 */
export async function ouvrirSession(session: { cookie: string; dureeMs: number }) {
  const c = await cookies();
  const commun = {
    secure: process.env.NODE_ENV === 'production',
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
