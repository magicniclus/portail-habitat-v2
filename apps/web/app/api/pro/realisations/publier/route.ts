import { entreePublierRealisation } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { publierRealisation } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const publier = action(
  {
    schema: entreePublierRealisation,
    nom: 'publierRealisation',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await publierRealisation(
      { ...servicesDemandesPro(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'realisations.modifier'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** Interrupteur « Public » d'un projet réalisé. */
export const POST = (requete: Request) => routeJson(requete, publier);
