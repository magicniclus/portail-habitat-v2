import { entreeSupprimerMediaSite } from '@ph/core/schemas';
import { bucketFichiers } from '@ph/firebase/admin';
import { supprimerMediaSite } from '@ph/firebase/sites';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { routeJson } from '@/server/json';
import { servicesSites } from '@/server/sites';

export const dynamic = 'force-dynamic';

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

/**
 * Image importée retirée de la médiathèque (refusée si le site l'utilise encore). En POST : une
 * requête DELETE avec un corps est bloquée par certaines extensions de navigateur (« Failed to
 * fetch », 18/11/2026).
 */
export const POST = (requete: Request) => routeJson(requete, supprimer);
