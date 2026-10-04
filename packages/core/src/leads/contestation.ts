/**
 * Contestation d'un appel d'offres débloqué (DATABASE §5 `remboursementsLeads`, ADMIN §2.5,
 * CGV Pro §1 bis) : 7 jours après le déblocage ; « hors zone » refusé d'office dans le rayon.
 */
export const DELAI_CONTESTATION_MS = 7 * 86_400_000;
/** Au-delà de 3 contestations acceptées pour une même demande, le lead est marqué douteux. */
export const SEUIL_LEAD_DOUTEUX = 3;

export const MOTIFS_CONTESTATION = {
  faux_numero: 'Numéro invalide',
  projet_inexistant: 'Projet inexistant',
  hors_zone: 'Hors de ma zone',
  doublon: 'Doublon',
  deja_realise: 'Travaux déjà réalisés',
  autre: 'Autre',
} as const;
export type MotifContestation = keyof typeof MOTIFS_CONTESTATION;

export type ExamenContestation =
  { etat: 'ouverte' } | { etat: 'hors_delai' } | { etat: 'refusee_auto'; raison: string };

export function examinerContestation(c: {
  debloqueLe: number;
  maintenant: number;
  motif: MotifContestation;
  distanceKm?: number;
  rayonKm?: number;
}): ExamenContestation {
  if (c.maintenant - c.debloqueLe > DELAI_CONTESTATION_MS) return { etat: 'hors_delai' };
  if (
    c.motif === 'hors_zone' &&
    c.distanceKm !== undefined &&
    c.rayonKm !== undefined &&
    c.distanceKm <= c.rayonKm
  )
    return {
      etat: 'refusee_auto',
      raison: `Chantier à ${Math.round(c.distanceKm)} km, dans votre rayon de ${c.rayonKm} km (CGV Pro §1 bis).`,
    };
  return { etat: 'ouverte' };
}

/** Crédits rendus si la contestation est acceptée en crédits. */
export function creditsARembourser(
  achat: { moyen: string; credits: number; prixHtCentimes: number },
  centimesParCredit: number,
): number {
  if (achat.moyen === 'carte') return Math.ceil(achat.prixHtCentimes / centimesParCredit);
  return achat.credits;
}

export const leadDouteux = (acceptees: number) => acceptees > SEUIL_LEAD_DOUTEUX;
