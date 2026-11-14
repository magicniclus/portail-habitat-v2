import { entreeMiseEnLigneFiche } from '@ph/core/schemas';
import { changerMiseEnLigne } from '@ph/firebase/pro';
import { action } from '@/server/action';
import { servicesDemandesPro } from '@/server/demandesPro';
import { routeJson } from '@/server/json';
import { ecrireFiche } from '@/server/republierFiche';

export const dynamic = 'force-dynamic';

const mettreEnLigne = action(
  {
    schema: entreeMiseEnLigneFiche,
    nom: 'mettreFicheEnLigne',
    rateLimit: { cle: 'fiche', max: 120, fenetre: '1h' },
  },
  async (e, ctx) =>
    ecrireFiche(ctx.uid!, (c) => changerMiseEnLigne(servicesDemandesPro(), c, e.enLigne)),
);

/** Interrupteur « En ligne » de la fiche : allumer exige logo, description et bannière. */
export const POST = (requete: Request) => routeJson(requete, mettreEnLigne);
