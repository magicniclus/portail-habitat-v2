import { entreeEntreprise } from '@ph/core/schemas';
import { quitterEntreprise } from '@ph/firebase/comptes';
import { routeEquipe } from '@/server/equipe';

export const dynamic = 'force-dynamic';

/** EQU-04 : quitter l'entreprise (refusé au dernier propriétaire). */
export const POST = routeEquipe(
  { schema: entreeEntreprise, nom: 'quitterEntreprise' },
  (s, uid, e) => quitterEntreprise(s, uid, e.artisanId),
);
