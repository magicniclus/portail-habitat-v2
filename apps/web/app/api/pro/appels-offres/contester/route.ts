import { entreeContestation } from '@ph/core/schemas';
import { contesterAppelOffres } from '@ph/firebase/matching';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const contester = action(
  {
    schema: entreeContestation,
    nom: 'contesterAppelOffres',
    rateLimit: { cle: 'contestations', max: 20, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'leads.debloquer');
    return contesterAppelOffres(servicesDemandesPro(), { ...e, artisanId, uid: ctx.uid! });
  },
);

/** Contester un appel d'offres débloqué depuis moins de 7 jours (DATABASE §5). */
export const POST = (requete: Request) => routeJson(requete, contester);
