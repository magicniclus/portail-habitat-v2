import 'server-only';
import { ErreurMetier } from '@ph/core/erreurs';
import { facturationBloquee } from './facturation';
import { flagActif } from './flags';
import { lireSessionPro } from './sessionPro';

/**
 * Déblocages des appels d'offres : derrière le flag. Paiement par carte ou achat de pack : double
 * authentification exigée comme pour la facturation (CON-02) ; pas pour dépenser des crédits.
 */
export async function paiementAutorise(carte: boolean): Promise<{ email: string }> {
  if (!(await flagActif('appelsOffresPayants')))
    throw new ErreurMetier('INDISPONIBLE', 'Le déblocage des appels d’offres ouvre bientôt.');
  const session = await lireSessionPro();
  if (!session) throw new ErreurMetier('NON_AUTHENTIFIE');
  if (carte && facturationBloquee(session))
    throw new ErreurMetier('PERMISSION_REFUSEE', 'Activez la double authentification d’abord.');
  return { email: session.email };
}
