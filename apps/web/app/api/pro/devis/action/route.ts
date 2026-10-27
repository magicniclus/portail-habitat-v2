import { entreeActionDevis } from '@ph/core/schemas';
import { dupliquerDevis, relancerDevis, supprimerDevis } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const agir = action(
  {
    schema: entreeActionDevis,
    nom: 'actionDevis',
    rateLimit: { cle: 'devis', max: 300, fenetre: '1h' },
  },
  async (e, ctx) => {
    const c = { artisanId: await entrepriseAutorisee(ctx.uid!, 'devis.gerer'), uid: ctx.uid! };
    const cible = { devisId: e.devisId };
    if (e.action === 'dupliquer') return dupliquerDevis(servicesDevis(), c, cible);
    if (e.action === 'supprimer') await supprimerDevis(servicesDevis(), c, cible);
    else
      await relancerDevis({ ...servicesDevis(), notifier: servicesComptes().notifier }, c, cible);
    return null;
  },
);

/** Menu « ⋮ » d'un devis : dupliquer (nouveau brouillon), supprimer un brouillon, relancer. */
export const POST = (requete: Request) => routeJson(requete, agir);
