import { entreeRepondreDemandeAcces } from '@ph/core/schemas';
import { repondreDemandeAcces } from '@ph/firebase/comptes';
import { routeEquipe } from '@/server/equipe';

export const dynamic = 'force-dynamic';

/** Réponse à une demande pour rejoindre l'entreprise (COMPTES §4.4). */
export const POST = routeEquipe(
  { schema: entreeRepondreDemandeAcces, nom: 'repondreDemandeAcces' },
  repondreDemandeAcces,
);
