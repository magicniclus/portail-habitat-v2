import { entreeInviterMembre } from '@ph/core/schemas';
import { inviterMembre } from '@ph/firebase/comptes';
import { routeEquipe } from '@/server/equipe';

export const dynamic = 'force-dynamic';

/** EQU-01 : invitation d'un membre (sièges et droits vérifiés par le service). */
export const POST = routeEquipe(
  { schema: entreeInviterMembre, nom: 'inviterMembre', idempotence: true },
  inviterMembre,
);
