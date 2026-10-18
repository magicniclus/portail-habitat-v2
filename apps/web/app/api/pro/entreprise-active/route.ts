import { entreeEntreprise } from '@ph/core/schemas';
import { appAdmin } from '@ph/firebase/admin';
import { choisirEntrepriseActive } from '@ph/firebase/comptes';
import { getFirestore } from 'firebase-admin/firestore';
import { action } from '@/server/action';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const choisir = action(
  {
    schema: entreeEntreprise,
    nom: 'choisirEntrepriseActive',
    rateLimit: { cle: 'entreprise-active', max: 60, fenetre: '1h' },
  },
  async (e, ctx) => {
    await choisirEntrepriseActive(getFirestore(appAdmin()), ctx.uid!, e.artisanId);
    return null;
  },
);

/** Sélecteur d'entreprise de l'espace pro (COMPTES §4.5) : appartenance vérifiée côté serveur. */
export const POST = (requete: Request) => routeJson(requete, choisir);
