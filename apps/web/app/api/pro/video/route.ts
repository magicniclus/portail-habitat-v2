import { entreeVideo } from '@ph/core/schemas';
import { z } from '@ph/core/zod';
import { enregistrerVideo } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';
import { ecrireFiche } from '@/server/republierFiche';

export const dynamic = 'force-dynamic';

const options = { rateLimit: { cle: 'medias', max: 60, fenetre: '1h' } } as const;

const enregistrer = action(
  { schema: entreeVideo, nom: 'enregistrerVideo', ...options },
  async (e, ctx) =>
    ecrireFiche(ctx.uid!, (c) => enregistrerVideo(servicesDemandesPro(), c, e.lien)),
);

const retirer = action(
  { schema: z.strictObject({}), nom: 'retirerVideo', ...options },
  async (_e, ctx) => ecrireFiche(ctx.uid!, (c) => enregistrerVideo(servicesDemandesPro(), c, null)),
);

/** Vidéo de présentation : lien YouTube (Ma fiche). */
export const POST = (requete: Request) => routeJson(requete, enregistrer);

/** Retrait de la vidéo de présentation. */
export const DELETE = (requete: Request) => routeJson(requete, retirer);
