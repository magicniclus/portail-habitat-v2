import { entreeModifierMembre } from '@ph/core/schemas';
import { modifierMembre } from '@ph/firebase/comptes';
import { routeEquipe } from '@/server/equipe';

export const dynamic = 'force-dynamic';

/** Changement de rôle d'un membre. */
export const POST = routeEquipe(
  { schema: entreeModifierMembre, nom: 'modifierMembre' },
  modifierMembre,
);
