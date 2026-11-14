import { entreeSupprimerRealisation } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { supprimerRealisation } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const supprimer = action(
  {
    schema: entreeSupprimerRealisation,
    nom: 'supprimerRealisation',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await supprimerRealisation(
      { ...servicesDemandesPro(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'realisations.modifier'), uid: ctx.uid! },
      e.rid,
    );
    return null;
  },
);

/** Retire une réalisation et ses photos. */
export const POST = (requete: Request) => routeJson(requete, supprimer);
