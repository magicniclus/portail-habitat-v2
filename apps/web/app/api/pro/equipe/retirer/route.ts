import { entreeMembre } from '@ph/core/schemas';
import { retirerMembre } from '@ph/firebase/comptes';
import { routeEquipe } from '@/server/equipe';

export const dynamic = 'force-dynamic';

/** EQU-05 : retrait d'un membre (jetons révoqués, accès coupé immédiatement). */
export const POST = routeEquipe({ schema: entreeMembre, nom: 'retirerMembre' }, retirerMembre);
