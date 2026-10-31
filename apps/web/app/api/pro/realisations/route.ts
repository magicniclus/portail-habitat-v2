import { entreeRealisation } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerRealisation } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeRealisation,
    nom: 'enregistrerRealisation',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await enregistrerRealisation(
      { ...servicesDemandesPro(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'realisations.modifier'), uid: ctx.uid! },
      e,
    );
    return null;
  },
);

/** Réalisation publiée depuis Ma fiche (accord du propriétaire du chantier, CGV §9). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
