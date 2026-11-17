import { entreeMediaSite, entreeSupprimerMediaSite } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { enregistrerMediaSite, supprimerMediaSite } from '@ph/firebase/sites';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { routeJson } from '@/server/json';
import { servicesSites } from '@/server/sites';

export const dynamic = 'force-dynamic';

const enregistrer = action(
  {
    schema: entreeMediaSite,
    nom: 'enregistrerMediaSite',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    enregistrerMediaSite(
      { ...servicesSites(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'site.gerer'), uid: ctx.uid! },
      e,
    ),
);

/** Image importée dans la médiathèque du site (déposée dans Storage, vérifiée ici). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);

const supprimer = action(
  {
    schema: entreeSupprimerMediaSite,
    nom: 'supprimerMediaSite',
    rateLimit: { cle: 'medias', max: 60, fenetre: '1h' },
  },
  async (e, ctx) =>
    supprimerMediaSite(
      { ...servicesSites(), bucket: bucketFichiers() },
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'site.gerer'), uid: ctx.uid! },
      e,
    ),
);

/** Image importée retirée de la médiathèque (refusée si le site l'utilise encore). */
export const DELETE = (requete: Request) => routeJson(requete, supprimer);
