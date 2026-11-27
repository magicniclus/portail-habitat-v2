/**
 * La maintenance s'applique partout sauf à l'admin, aux API et aux fichiers statiques (ERR-03).
 * Lot 1b : interrupteur par variable d'environnement ; lot 2 : `config/app.maintenance`.
 */
export function doitAfficherMaintenance(chemin: string, active: boolean): boolean {
  if (!active) return false;
  return !/^\/(admin|api|maintenance|_next)(\/|$)/.test(chemin) && !/\.[a-z0-9]+$/i.test(chemin);
}
