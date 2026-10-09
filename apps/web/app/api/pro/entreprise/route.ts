import { entreeRechercherEntreprise } from '@ph/core/schemas';
import { rechercherEntreprise } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
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
  async (e) => rechercherEntreprise(servicesComptes(), e.q),
);

/** Recherche d'entreprise par nom ou SIREN (COMPTES §3.1, ONB-01 à 03). */
export const POST = (requete: Request) => routeJson(requete, rechercher);
