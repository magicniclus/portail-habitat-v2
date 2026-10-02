/** Constantes de la maquette « Laisser un avis ». */
export const LIBELLES_NOTE = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent'];

export const CRITERES_AVIS = [
  { id: 'qualite', nom: 'Qualité du travail' },
  { id: 'delais', nom: 'Respect des délais' },
  { id: 'proprete', nom: 'Propreté du chantier' },
  { id: 'rapportQP', nom: 'Rapport qualité / prix' },
] as const;

export const POINTS_POSITIFS = [
  'Devis clair',
  'Ponctuel',
  'Chantier propre',
  'Bon conseil',
  'Délais tenus',
  'Prix respecté',
  'Travail soigné',
  'Bonne communication',
] as const;

export const TYPES_TRAVAUX_AVIS = [
  'Salle de bain',
  'Cuisine',
  'Peinture / décoration',
  'Électricité',
  'Plomberie',
  'Toiture / couverture',
  'Isolation',
  'Rénovation globale',
  'Autre',
] as const;

/** Commentaire : 1 200 caractères au plus (AVI-02). */
export const TEXTE_AVIS_MAX = 1200;

/** Mois de fin de chantier acceptable : pas dans le futur, 3 ans au plus (conservation des avis). */
export function finChantierValide(mois: string, maintenant: Date): boolean {
  const [a, m] = mois.split('-').map(Number);
  if (!a || !m) return false;
  const indice = a * 12 + (m - 1);
  const actuel = maintenant.getUTCFullYear() * 12 + maintenant.getUTCMonth();
  return indice <= actuel && actuel - indice <= 36;
}

/**
 * Clé d'unicité d'un avis (AVI-04) : même email, même artisan, même mois de chantier. Texte à
 * hacher côté serveur ; seule l'empreinte est stockée, dans la partie privée de l'avis.
 */
export const texteUniciteAvis = (email: string, artisanId: string, finChantier: string) =>
  `avis|${email.trim().toLowerCase()}|${artisanId}|${finChantier}`;
