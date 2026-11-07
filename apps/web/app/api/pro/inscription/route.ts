import { entreeInscriptionEtape1 } from '@ph/core/schemas';
import { enregistrerEtape1 } from '@ph/firebase/comptes';
import { cookies } from 'next/headers';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { COOKIE_INSCRIPTION, poserBrouillon } from '@/server/inscription';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const etape1 = action(
  {
    schema: entreeInscriptionEtape1,
    nom: 'inscriptionEtape1',
    authentification: 'facultative',
    rateLimit: { cle: 'inscription', max: 10, fenetre: '1h' },
  },
  async (e) => {
    if (e.site) return null;
    const existant = (await cookies()).get(COOKIE_INSCRIPTION)?.value;
    const { brouillonId } = await enregistrerEtape1(servicesComptes(), e, existant);
    await poserBrouillon(brouillonId);
    return null;
  },
);

/** Étape 1 de l'inscription pro (formulaire de la page d'acquisition). */
export const POST = (requete: Request) => routeJson(requete, etape1);
