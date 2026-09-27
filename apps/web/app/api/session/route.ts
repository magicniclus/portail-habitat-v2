import { messageErreur } from '@ph/core/erreurs';
import { entreeSession } from '@ph/core/schemas';
import { COOKIE_SESSION, creerCookieSession } from '@ph/firebase/serveur';
import { cookies } from 'next/headers';
import { memeOrigine } from '@/server/origine';

export const dynamic = 'force-dynamic';

const refus = (
  statut: number,
  code: 'PERMISSION_REFUSEE' | 'ENTREE_INVALIDE' | 'NON_AUTHENTIFIE',
) => Response.json({ ok: false, code, message: messageErreur(code) }, { status: statut });

/** Connexion : échange le jeton Firebase contre un cookie de session httpOnly (COMPTES §5). */
export async function POST(requete: Request) {
  if (!memeOrigine(requete)) return refus(403, 'PERMISSION_REFUSEE');
  const entree = entreeSession.safeParse(await requete.json().catch(() => null));
  if (!entree.success) return refus(400, 'ENTREE_INVALIDE');
  const session = await creerCookieSession(entree.data.jetonId, entree.data.espace);
  if (!session) return refus(401, 'NON_AUTHENTIFIE');
  (await cookies()).set(COOKIE_SESSION, session.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(session.dureeMs / 1000),
  });
  return Response.json({ ok: true, data: null });
}

/** Déconnexion : le cookie est effacé (les jetons sont révoqués par les Functions en cas de retrait). */
export async function DELETE(requete: Request) {
  if (!memeOrigine(requete)) return refus(403, 'PERMISSION_REFUSEE');
  (await cookies()).delete(COOKIE_SESSION);
  return Response.json({ ok: true, data: null });
}
