import { z } from '@ph/core/zod';
import { lireMesDemandes, lireProfilEspace } from '@ph/firebase/espace';
import { action } from '@/server/action';
import { servicesEspace } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const lire = action(
  { schema: z.strictObject({}), nom: 'lireMesDemandes', lectureSeule: true },
  async (_e, ctx) => {
    const s = servicesEspace();
    const [profil, demandes] = await Promise.all([
      lireProfilEspace(s.db, ctx.uid!),
      lireMesDemandes(s, ctx.uid!),
    ]);
    return { profil, demandes };
  },
);

/** « Mes projets » (ESP-01) : profil et demandes du particulier connecté. */
export const POST = (requete: Request) => routeJson(requete, lire);
