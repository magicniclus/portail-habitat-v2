import { entreeInvitation } from '@ph/core/schemas';
import { revoquerInvitation } from '@ph/firebase/comptes';
import { routeEquipe } from '@/server/equipe';

export const dynamic = 'force-dynamic';

/** Annule une invitation en cours (libère le siège). */
export const POST = routeEquipe(
  { schema: entreeInvitation, nom: 'revoquerInvitation' },
  revoquerInvitation,
);
