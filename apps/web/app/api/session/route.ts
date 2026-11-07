import { messageErreur } from '@ph/core/erreurs';
import { entreeSession } from '@ph/core/schemas';
import { creerCookieSession } from '@ph/firebase/serveur';
import { memeOrigine } from '@/server/origine';
import { fermerSession, ouvrirSession } from '@/server/sessionCookies';

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
  await ouvrirSession(session);
  return Response.json({ ok: true, data: null });
}

/** Déconnexion : le cookie est effacé (les jetons sont révoqués par les Functions en cas de retrait). */
export async function DELETE(requete: Request) {
  if (!memeOrigine(requete)) return refus(403, 'PERMISSION_REFUSEE');
  await fermerSession();
  return Response.json({ ok: true, data: null });
}
