import 'server-only';
import { flagActif } from './flags';

/**
 * Pages d'acquisition : les blocs qui mettent Plans en avant ne s'affichent que si la page publique
 * et l'essai sont ouverts (flags `dessin` et `dessinPublic`), pour ne jamais mener à une 404.
 */
export async function plansPublicsOuverts(): Promise<boolean> {
  return (await flagActif('dessin')) && (await flagActif('dessinPublic'));
}

/** Pages artisans : l'outil Plans de l'espace pro existe (flag `dessin`). */
export function plansProOuverts(): Promise<boolean> {
  return flagActif('dessin');
}
