import { z } from '@ph/core/zod';
import { lireDemandesPro, marquerDemandesVues } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseRepondante, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const lire = action(
  { schema: z.strictObject({}), nom: 'lireDemandesPro', lectureSeule: true },
  async (_e, ctx) => {
    const artisanId = await entrepriseRepondante(ctx.uid!);
    // « Voir en tant que » (admin) : lecture seule, rien n'est marqué comme vu.
    if (!ctx.impersonation) await marquerDemandesVues(servicesDemandesPro(), artisanId);
    return lireDemandesPro(servicesDemandesPro(), artisanId);
  },
);

/** « Mes demandes » : relue à chaque changement signalé par l'écoute temps réel (PRO-01). */
export const POST = (requete: Request) => routeJson(requete, lire);
