import { entreeCompteInvite } from '@ph/core/schemas';
import { creerCompteInvite } from '@ph/firebase/comptes';
import { action } from '@/server/action';
import { servicesComptes } from '@/server/espace';
import { routeJson } from '@/server/json';

export const dynamic = 'force-dynamic';

const creer = action(
  {
    schema: entreeCompteInvite,
    nom: 'creerCompteInvite',
    authentification: 'facultative',
    rateLimit: { cle: 'invitation', max: 10, fenetre: '1h' },
  },
  async (e) => creerCompteInvite(servicesComptes(), e),
);

/** Accès d'une personne invitée sans compte (le lien prouve son adresse, COMPTES §4.2). */
export const POST = (requete: Request) => routeJson(requete, creer);
