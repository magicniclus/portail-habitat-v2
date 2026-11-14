import { entreeLienConnexion } from '@ph/core/schemas';
import { envoyerReinitialisation } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const demander = action(
  {
    schema: entreeLienConnexion,
    nom: 'demanderReinitialisation',
    authentification: 'facultative',
    rateLimit: { cle: 'reinitialisation', max: 5, fenetre: '1h' },
  },
  async (e) => {
    // Réponse identique que le compte existe ou non (CON-01) ; plafond par adresse dans le service.
    if (!e.site) await envoyerReinitialisation(servicesComptes(), e.email);
    return null;
  },
);

/** « Mot de passe oublié ? » de la connexion pro. */
export const POST = (requete: Request) => routeJson(requete, demander);
