import { entreeConnexionLien } from '@ph/core/schemas';
import { ErreurMetier } from '@ph/core/erreurs';
import { connecterParLien } from '@ph/firebase/espace';
import { COOKIE_SESSION, creerCookieSession } from '@ph/firebase/serveur';
import { cookies } from 'next/headers';
import { action } from '@/server/action';
import { servicesConnexion } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const verifier = action(
  {
    schema: entreeConnexionLien,
    nom: 'connecterParLien',
    authentification: 'facultative',
    rateLimit: { cle: 'connexion', max: 10, fenetre: '1h' },
  },
  async (e) => {
    const { jetonId } = await connecterParLien(servicesConnexion(), e);
    const session = await creerCookieSession(jetonId, 'particulier');
    if (!session) throw new ErreurMetier('NON_AUTHENTIFIE');
    (await cookies()).set(COOKIE_SESSION, session.cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(session.dureeMs / 1000),
    });
    return null;
  },
);

/** Retour du lien magique (`/connexion/lien`) : ouvre la session particulier (cookie httpOnly). */
export const POST = (requete: Request) => routeJson(requete, verifier);
