import { entreeRechercherEntreprise } from '@ph/core/schemas';
import { rechercherEntreprise } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { brouillonCourant } from '@/server/inscription';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const rechercher = action(
  {
    schema: entreeRechercherEntreprise,
    nom: 'rechercherEntreprise',
    authentification: 'facultative',
    lectureSeule: true,
    rateLimit: { cle: 'entreprise', max: 30, fenetre: '1h' },
  },
  // Par nom : le département de l'artisan d'abord (code postal de l'étape 1), puis toute la France.
  async (e) => {
    const b = await brouillonCourant();
    return rechercherEntreprise(
      servicesComptes(),
      e.q,
      b ? { codePostal: b.identite.codePostal } : {},
    );
  },
);

/** Recherche d'entreprise par nom ou SIREN (COMPTES §3.1, ONB-01 à 03). */
export const POST = (requete: Request) => routeJson(requete, rechercher);
