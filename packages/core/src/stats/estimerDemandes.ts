/**
 * Nombre de demandes affiché aux artisans (STATS_DEMANDES.md), portage de PH_DEMANDES.estimer.
 * Paramètres et population passés en argument : `stats/modeleDemandes` et fichier Insee versionné.
 */
export interface ModeleDemandes {
  /** Demandes déposées par habitant et par an sur la plateforme. */
  tauxHabitantAn: number;
  /** Part de la population du département couverte selon le rayon (km). */
  couverture: Readonly<Record<string, number>>;
  /** Zone dense : le rayon déborde sur les départements voisins. */
  petiteCouronne: { departements: readonly string[]; couverture: number; couvertureLarge: number };
  /** Part des demandes par famille de travaux (somme = 1). */
  familles: Readonly<Record<string, number>>;
  familleParDefaut: number;
  /** Saisonnalité de janvier à décembre (moyenne = 1). */
  saison: readonly number[];
  minimum: number;
}

export interface ReferentielMetiers {
  metiers: Readonly<Record<string, { famille: string }>>;
  intentions: readonly { metier: string; popularite: number }[];
}

export interface EntreeDemandes {
  codePostal: string;
  metiers: readonly string[];
  rayonKm: number;
  /** Mois de 1 à 12 (heure de Paris, calculé par l'appelant). */
  mois: number;
}

export type SourceDemandes = 'reel' | 'modele';

export interface EstimationDemandes {
  total: number | null;
  /** Par identifiant de métier, ou `tous` sans métier. */
  parMetier: Record<string, number>;
  departement: string | null;
  source: SourceDemandes;
}

/** Département d'un code postal : Corse 2A / 2B, outre-mer sur 3 chiffres. */
export function departementDuCodePostal(codePostal: string): string | null {
  const cp = codePostal.replace(/\D/g, '');
  if (cp.length < 2) return null;
  if (cp.startsWith('97')) return cp.slice(0, 3);
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
}

/** Part d'un métier = part de sa famille × poids de ses intentions (popularité) dans la famille. */
export function partMetier(id: string, m: ModeleDemandes, r: ReferentielMetiers): number {
  const metier = r.metiers[id];
  if (!metier) return 1;
  const pf = m.familles[metier.famille] || m.familleParDefaut;
  const poids = (x: string) =>
    r.intentions.filter((i) => i.metier === x).reduce((a, i) => a + i.popularite, 0);
  const total =
    Object.keys(r.metiers)
      .filter((x) => r.metiers[x]!.famille === metier.famille)
      .reduce((a, x) => a + poids(x), 0) || 1;
  return pf * (poids(id) / total);
}

/** Estimation par le modèle (libellé « demandes estimées »), jamais présentée comme un décompte réel. */
export function estimerDemandes(
  e: EntreeDemandes,
  m: ModeleDemandes,
  population: Readonly<Record<string, number>>,
  r: ReferentielMetiers,
): EstimationDemandes {
  const departement = departementDuCodePostal(e.codePostal);
  const pop = departement ? population[departement] : undefined;
  if (!pop) return { total: null, parMetier: {}, departement, source: 'modele' };
  let couv = m.couverture[String(e.rayonKm)] ?? m.couverture['30']!;
  if (m.petiteCouronne.departements.includes(departement!))
    couv = Math.max(
      couv,
      e.rayonKm >= 50 ? m.petiteCouronne.couvertureLarge : m.petiteCouronne.couverture,
    );
  const base = ((pop * couv * m.tauxHabitantAn) / 12) * m.saison[e.mois - 1]!;
  const ids = e.metiers.length ? e.metiers : [null];
  const parMetier: Record<string, number> = {};
  let total = 0;
  for (const id of ids) {
    const n = Math.max(m.minimum, Math.round(base * (id ? partMetier(id, m, r) : 1)));
    parMetier[id ?? 'tous'] = n;
    total += n;
  }
  return { total, parMetier, departement, source: 'modele' };
}

/** Historique minimal dans le département pour afficher le réel (§1). */
export const MOIS_HISTORIQUE_MINIMUM = 3;

export interface DemandesReelles {
  /** Mois d'historique disponibles dans le département. */
  moisHistorique: number;
  /** Demandes des 30 derniers jours par métier (mises en relation + appels d'offres). */
  parMetier: Readonly<Record<string, number>>;
}

/** Réel dès 3 mois d'historique (libellé « demandes déposées »), sinon le modèle. */
export function demandesAffichees(
  modele: EstimationDemandes,
  reel: DemandesReelles | null,
): EstimationDemandes {
  if (!reel || reel.moisHistorique < MOIS_HISTORIQUE_MINIMUM || modele.total === null)
    return modele;
  const parMetier: Record<string, number> = {};
  let total = 0;
  for (const id of Object.keys(modele.parMetier)) {
    const n =
      id === 'tous'
        ? Object.values(reel.parMetier).reduce((a, x) => a + x, 0)
        : (reel.parMetier[id] ?? 0);
    parMetier[id] = n;
    total += n;
  }
  return { total, parMetier, departement: modele.departement, source: 'reel' };
}
