import { entreeConnexionLien } from '@ph/core/schemas';
import { ErreurMetier } from '@ph/core/erreurs';
import { connecterParLien } from '@ph/firebase/espace';
import { creerCookieSession } from '@ph/firebase/serveur';
import { action } from '@/server/action';
import { servicesConnexion } from '@/server/espace';
import { routeJson } from '@/server/json';
import { ouvrirSession } from '@/server/sessionCookies';

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
    await ouvrirSession(session);
    return null;
  },
);

/** Retour du lien magique (`/connexion/lien`) : ouvre la session particulier (cookie httpOnly). */
export const POST = (requete: Request) => routeJson(requete, verifier);
