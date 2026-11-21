import { ErreurMetier } from '@ph/core/erreurs';
import { entreeInscriptionEtape2 } from '@ph/core/schemas';
import { enregistrerZone } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { brouillonCourant } from '@/server/inscription';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const zone = action(
  {
    schema: entreeInscriptionEtape2,
    nom: 'inscriptionZone',
    authentification: 'facultative',
    rateLimit: { cle: 'inscription', max: 30, fenetre: '1h' },
  },
  async (e) => {
    const b = await brouillonCourant();
    if (!b)
      throw new ErreurMetier(
        'PRECONDITION',
        'Votre inscription a expiré : recommencez depuis la page Pro.',
      );
    await enregistrerZone(servicesComptes(), b.brouillonId, e);
    return null;
  },
);

/** Étape 2 de l'inscription pro : ville et rayon. */
export const POST = (requete: Request) => routeJson(requete, zone);
