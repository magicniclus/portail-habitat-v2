import { entreeContactFiche } from '@ph/core/schemas';
import { envoyerContactFiche } from '@ph/firebase/demandes';
import { action } from '@/server/action';
import { servicesCompte } from '@/server/compte';
import { routeJson } from '@/server/json';
import { traceRequete } from '@/server/trace';

export const dynamic = 'force-dynamic';

const envoyer = action(
  {
    schema: entreeContactFiche,
    nom: 'envoyerContactFiche',
    authentification: 'facultative',
    rateLimit: { cle: 'contactFiche', max: 5, fenetre: '1h' },
    idempotence: true,
  },
  async (e) => {
    const r = await envoyerContactFiche(servicesCompte(), {
      artisanId: e.artisanId,
      prenom: e.prenom,
      nom: e.nom,
      email: e.email,
      telephone: e.telephone,
      codePostal: e.codePostal,
      description: e.description,
      trace: await traceRequete(),
    });
    return { reference: r.reference };
  },
);

/**
 * Fiche publique : « Laisser mes coordonnées à l'artisan ». Même protection que le simulateur
 * (App Check, limite de débit, idempotence) ; demande attribuée directement, gratuite.
 */
export function POST(requete: Request) {
  return routeJson(requete, envoyer);
}
