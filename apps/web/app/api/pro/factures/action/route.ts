import { entreeActionFacture } from '@ph/core/schemas';
import { dupliquerFacture, envoyerFactureEmail, supprimerFacture } from '@ph/firebase/devis';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { servicesDevis } from '@/server/devis';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const agir = action(
  {
    schema: entreeActionFacture,
    nom: 'actionFacture',
    rateLimit: { cle: 'factures', max: 300, fenetre: '1h' },
  },
  async (e, ctx) => {
    const c = { artisanId: await entrepriseAutorisee(ctx.uid!, 'factures.emettre'), uid: ctx.uid! };
    const cible = { factureId: e.factureId };
    if (e.action === 'dupliquer') return dupliquerFacture(servicesDevis(), c, cible);
    if (e.action === 'supprimer') await supprimerFacture(servicesDevis(), c, cible);
    else
      await envoyerFactureEmail(
        { ...servicesDevis(), notifier: servicesComptes().notifier },
        c,
        cible,
      );
    return null;
  },
);

/** Menu « ⋮ » d'une facture : dupliquer (brouillon), supprimer un brouillon, envoyer par email. */
export const POST = (requete: Request) => routeJson(requete, agir);
