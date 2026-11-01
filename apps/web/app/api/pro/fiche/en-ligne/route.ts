import { entreeMiseEnLigneFiche } from '@ph/core/schemas';
import { mettreFicheEnLigne } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const mettreEnLigne = action(
  {
    schema: entreeMiseEnLigneFiche,
    nom: 'mettreFicheEnLigne',
    rateLimit: { cle: 'fiche', max: 120, fenetre: '1h' },
  },
  async (_e, ctx) =>
    mettreFicheEnLigne(servicesDemandesPro(), {
      artisanId: await entrepriseAutorisee(ctx.uid!, 'fiche.modifier'),
      uid: ctx.uid!,
    }),
);

/** « Mettre ma fiche en ligne » : fiche complète (logo, description, bannière) exigée. */
export const POST = (requete: Request) => routeJson(requete, mettreEnLigne);
