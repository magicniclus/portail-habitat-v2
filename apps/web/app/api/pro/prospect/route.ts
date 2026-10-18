import { entreeProspect } from '@ph/core/schemas';
import { enregistrerProspect } from '@ph/firebase/cycle';
import { geocodeurApiGeo } from '@ph/firebase/demandes';
import { nomMetier } from '@/features/pro/metiers';
import { URL_SITE } from '@/features/vitrine/seo';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';
import { demandesEstimees } from '@/server/statsDemandes';

export const dynamic = 'force-dynamic';

const recevoir = action(
  {
    schema: entreeProspect,
    nom: 'enregistrerProspect',
    authentification: 'facultative',
    rateLimit: { cle: 'prospect', max: 5, fenetre: '1h' },
  },
  async (e) => {
    if (e.site) return null;
    const c = servicesComptes();
    await enregistrerProspect(
      {
        db: c.db,
        horloge: c.horloge,
        notifier: c.notifier,
        geocodeur: geocodeurApiGeo(),
        estimerDemandes: (codePostal, metier) =>
          demandesEstimees({ codePostal, metiers: [metier], rayonKm: 30 }).total,
        nomMetier,
        urlSite: URL_SITE,
      },
      e,
    );
    return null;
  },
);

/** « Recevoir l'estimation par email » sur la page d'acquisition (prospect, CONVERSION §3 S1). */
export const POST = (requete: Request) => routeJson(requete, recevoir);
