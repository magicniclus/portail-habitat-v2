/**
 * Données d'un email de conversion (CONVERSION §1.2) : chaque modèle a ses chiffres obligatoires.
 * S'il en manque un (ou s'il vaut 0), l'email ne part pas : le moteur trace « plus_valable ».
 */
const REQUIS: Record<string, readonly string[]> = {
  'prospect-estimation': ['demandes30j'],
  'prospect-demande-zone': [
    'travaux',
    'budgetMinCentimes',
    'budgetMaxCentimes',
    'distanceKm',
    'delai',
  ],
  'prospect-temoignage': ['joursPremiereDemande', 'demandes30j'],
  'prospect-derniere': ['signataire'],
  'resume-zone-mensuel': ['mois', 'demandes', 'budgetMoyenCentimes'],
  'vis-position': ['vues7j', 'position', 'total', 'vuesMisesEnAvant'],
  'vis-concurrents': ['misesEnAvant', 'position', 'total', 'recul', 'recherches30j'],
  'vis-recherches-manquees': ['recherches7j'],
  'vis-offre-lancement': ['code', 'pourcentage', 'expire'],
  'vis-offre-rappel': ['code', 'pourcentage', 'expire'],
  'vis-offre-relance': ['code', 'pourcentage', 'expire'],
  'vis-demande-offerte': [
    'travaux',
    'budgetMinCentimes',
    'budgetMaxCentimes',
    'distanceKm',
    'delai',
  ],
  'prem-bilan-visibilite': ['vues', 'appels', 'demandes'],
  'prem-demandes-manquees': ['semaine', 'demandes'],
  'prem-credits': ['credits30j', 'montant30jCentimes'],
  'prem-appel-offres-complet': ['travaux'],
  'prem-renouvellement': ['date'],
  'passage-annuel': [],
  'garantie-tenue': ['demandesMois'],
  'resiliation-alternative': ['produit', 'finLe'],
  'reconquete-1': ['demandesExclusives', 'recherches', 'position', 'code', 'expire'],
  'reconquete-2': ['signataire'],
};

const present = (v: unknown) =>
  v !== undefined && v !== null && v !== '' && v !== 0 && !(Array.isArray(v) && v.length === 0);

export type DonneesPreparees =
  { ok: true; donnees: Record<string, unknown> } | { ok: false; manque: string };

export function preparerDonnees(
  modele: string,
  contexte: Record<string, unknown>,
): DonneesPreparees {
  const requis = REQUIS[modele];
  if (!requis) return { ok: false, manque: 'modele' };
  const manque = ['metier', 'ville', 'lien', ...requis].find((k) => !present(contexte[k]));
  return manque ? { ok: false, manque } : { ok: true, donnees: contexte };
}
