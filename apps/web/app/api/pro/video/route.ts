import { entreeVideo } from '@ph/core/schemas';
import { z } from '@ph/core/zod';
import { enregistrerVideo } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const options = { rateLimit: { cle: 'medias', max: 60, fenetre: '1h' } } as const;

const enregistrer = action(
  { schema: entreeVideo, nom: 'enregistrerVideo', ...options },
  async (e, ctx) =>
    enregistrerVideo(
      servicesDemandesPro(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'fiche.modifier'), uid: ctx.uid! },
      e.lien,
    ),
);

const retirer = action(
  { schema: z.strictObject({}), nom: 'retirerVideo', ...options },
  async (_e, ctx) =>
    enregistrerVideo(
      servicesDemandesPro(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'fiche.modifier'), uid: ctx.uid! },
      null,
    ),
);

/** Vidéo de présentation : lien YouTube (Ma fiche). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);

/** Retrait de la vidéo de présentation. */
export const DELETE = (requete: Request) => routeJson(requete, retirer);
