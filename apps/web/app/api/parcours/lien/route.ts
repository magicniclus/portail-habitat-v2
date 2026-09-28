import { repriseSimulateur } from '@ph/core/parcours';
import { entreeLienReprise } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { notifier, planifierCloudTask } from '@ph/firebase/notifications';
import { demanderLienReprise } from '@ph/firebase/parcours';
import { getFirestore } from 'firebase-admin/firestore';
import { URL_SITE } from '@/features/vitrine/seo';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';
import { lireCatalogueSimulateur } from '@/server/simulateur';

export const dynamic = 'force-dynamic';

const envoyer = action(
  {
    schema: entreeLienReprise,
    nom: 'demanderLienReprise',
    authentification: 'facultative',
    rateLimit: { cle: 'lien-reprise', max: 5, fenetre: '1h' },
  },
  async (e) => {
    // Résumé calculé ici (jamais un texte du navigateur dans un email) et sans montant.
    const p = lireCatalogueSimulateur().prestations.find((x) => x.id === e.brouillon.prestationId);
    const resume = p ? repriseSimulateur(e.brouillon, p).resume : 'Votre estimation';
    const db = getFirestore(appAdmin());
    return demanderLienReprise(
      {
        db,
        horloge: Date.now,
        notifier: (n) => notifier({ db, horloge: Date.now, planifier: planifierCloudTask }, n),
        urlSite: URL_SITE,
      },
      { brouillon: e.brouillon, email: e.email, resume },
    );
  },
);

/** « M'envoyer un lien pour reprendre plus tard » (REPRISE_PARCOURS §5, SIM-06g et h). */
export const POST = (requete: Request) => routeJson(requete, envoyer);
