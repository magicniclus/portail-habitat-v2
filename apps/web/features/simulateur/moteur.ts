import { creerMoteur, type DonneesRecherche } from '@ph/core/recherche';
import donnees from '../../../../docs/data/recherche-intentions.json';

/** Même moteur que l'accueil (lot 7), chargé à la première frappe de l'étape 1. */
const moteur = creerMoteur(donnees as unknown as DonneesRecherche);

/** Prestations des intentions reconnues, dans l'ordre de pertinence. */
export function prestationsTrouvees(q: string): string[] {
  const ids: string[] = [];
  for (const r of moteur.rechercher(q, { max: 30 }).resultats)
    if (r.prestation && !ids.includes(r.prestation)) ids.push(r.prestation);
  return ids;
}
