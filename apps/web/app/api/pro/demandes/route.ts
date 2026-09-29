import { z } from '@ph/core/zod';
import { lireDemandesPro } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseRepondante, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const lire = action(
  { schema: z.strictObject({}), nom: 'lireDemandesPro', lectureSeule: true },
  async (_e, ctx) => lireDemandesPro(servicesDemandesPro(), await entrepriseRepondante(ctx.uid!)),
);

/** « Mes demandes » : relue à chaque changement signalé par l'écoute temps réel (PRO-01). */
export const POST = (requete: Request) => routeJson(requete, lire);
