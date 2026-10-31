import { ErreurMetier } from '@ph/core/erreurs';
import { entreeModifierFiche } from '@ph/core/schemas';
import { modifierFiche } from '@ph/firebase/pro';
import { nomMetier } from '@/features/pro/metiers';
import { action } from '@/server/action';
import { entrepriseAutorisee, servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const modifier = action(
  {
    schema: entreeModifierFiche,
    nom: 'modifierFiche',
    rateLimit: { cle: 'fiche', max: 120, fenetre: '1h' },
  },
  async (e, ctx) => {
    // Métiers : seulement ceux du référentiel (recherche-intentions.json).
    if (e.metiers?.some((m) => !nomMetier(m)))
      throw new ErreurMetier('ENTREE_INVALIDE', 'Métier inconnu.');
    return modifierFiche(
      servicesDemandesPro(),
      { artisanId: await entrepriseAutorisee(ctx.uid!, 'fiche.modifier'), uid: ctx.uid! },
      e,
    );
  },
);

/** Ma fiche : une section à la fois (droit `fiche.modifier`). */
export const POST = (requete: Request) => routeJson(requete, modifier);
