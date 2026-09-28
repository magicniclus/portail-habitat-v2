import { entreeLienConnexion } from '@ph/core/schemas';
import { envoyerLienConnexion } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const demander = action(
  {
    schema: entreeLienConnexion,
    nom: 'demanderLienConnexion',
    authentification: 'facultative',
    rateLimit: { cle: 'lien-connexion', max: 5, fenetre: '1h' },
  },
  async (e) => {
    // Même réponse que l'adresse ait un compte ou non (CON-01) ; plafond par adresse dans le service.
    if (!e.site) await envoyerLienConnexion(servicesComptes(), e.email, 'particulier');
    return null;
  },
);

/** « Recevoir un lien de connexion » (`/connexion`, particuliers). */
export const POST = (requete: Request) => routeJson(requete, demander);
