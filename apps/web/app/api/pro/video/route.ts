import { entreeVideo } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerVideo } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeVideo,
    nom: 'enregistrerVideo',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    enregistrerVideo(
      { ...servicesDemandesPro(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'fiche.modifier'), uid: ctx.uid! },
      e.nomFichier,
    ),
);

/** Vidéo de présentation, déposée dans Storage puis vérifiée (Ma fiche). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);
