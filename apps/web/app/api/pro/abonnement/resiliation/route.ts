import { ErreurMetier } from '@ph/core/erreurs';
import { entreeResiliation } from '@ph/core/schemas';
import {
  accepterAlternative,
  confirmerResiliation,
  proposerAlternative,
} from '@ph/firebase/facturation';
import { action } from '@/server/action';
import { entrepriseAutorisee } from '@/server/demandesPro';
import { facturationBloquee, servicesCheckout } from '@/server/facturation';
import { routeJson } from '@/server/json';
import { lireSessionPro } from '@/server/sessionPro';

export const dynamic = 'force-dynamic';

const resilier = action(
  {
    schema: entreeResiliation,
    nom: 'parcoursResiliation',
    rateLimit: { cle: 'resiliation', max: 20, fenetre: '1h' },
  },
  async (e, ctx) => {
    const artisanId = await entrepriseAutorisee(ctx.uid!, 'abonnement.gerer');
    const session = await lireSessionPro();
    if (!session || facturationBloquee(session))
      throw new ErreurMetier('PERMISSION_REFUSEE', 'Activez la double authentification d’abord.');
    const c = servicesCheckout();
    const s = { db: c.db, horloge: c.horloge, stripe: c.stripe };
    const p = { artisanId, abonnementId: e.abonnementId, raison: e.raison };
    if (e.etape === 'proposer') return { alternative: await proposerAlternative(s, p) };
    if (e.etape === 'accepter') return { alternative: await accepterAlternative(s, p) };
    return await confirmerResiliation(s, p);
  },
);

/** Parcours de résiliation : alternative proposée, acceptée, ou résiliation confirmée (S8). */
export const POST = (requete: Request) => routeJson(requete, resilier);
