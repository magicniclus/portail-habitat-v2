import 'server-only';
import { estimerDemandes, type EstimationDemandes, type ModeleDemandes } from '@ph/core/stats';
import recherche from '../../../docs/data/recherche-intentions.json';
import stats from '../../../docs/data/stats-demandes.json';

const referentiel = {
  metiers: recherche.metiers as Record<string, { famille: string }>,
  intentions: recherche.intentions as { metier: string; popularite: number }[],
};

/** Mois en cours à Paris (1 à 12) : la saisonnalité suit l'heure française, pas celle du serveur. */
const moisParis = (d = new Date()) =>
  Number(
    new Intl.DateTimeFormat('fr-FR', { month: 'numeric', timeZone: 'Europe/Paris' }).format(d),
  );

/**
 * Nombre de demandes affiché aux artisans (STATS_DEMANDES.md) : même calcul pour la page
 * d'acquisition et l'étape 2, donc même chiffre pour les mêmes paramètres (ACQ-01). Le réel
 * (`statsZones`) remplacera le modèle dès 3 mois d'historique dans le département.
 */
export function demandesEstimees(e: {
  codePostal: string;
  metiers: string[];
  rayonKm: number;
}): EstimationDemandes {
  return estimerDemandes(
    { ...e, mois: moisParis() },
    stats.modele as unknown as ModeleDemandes,
    stats.population as Record<string, number>,
    referentiel,
  );
}

/**
 * Base des demandes récentes des étapes 2 et 3 : demandes du mois à 30 km pour les métiers de
 * l'artisan (17/11/2026 : tous métiers donnait des nombres bien trop gros).
 */
export function baseDemandesRecentes(codePostal: string | undefined, metiers: string[]) {
  const total = codePostal
    ? demandesEstimees({ codePostal, metiers: metiers.slice(0, 5), rayonKm: 30 }).total
    : null;
  return {
    metiers: metiers.slice(0, 5),
    mensuel30: total,
    couverture: (stats.modele as unknown as ModeleDemandes).couverture,
  };
}
