import { distanceKm } from '../matching/filtres';

const H = 3_600_000;

/** Demandes invendues offertes (CONVERSION §3 bis, D31e) : valeurs par défaut. */
export const DEMANDE_OFFERTE = {
  /** Appel d'offres sans déblocage depuis 24 h. */
  apresH: 24,
  /** Demande de moins de 72 h : au-delà, elle n'est plus offerte. */
  fraicheurH: 72,
  destinataires: 5,
  /** Délai pour activer Visibilité après l'email. */
  attenteH: 48,
} as const;

export function demandeOffrable(
  e: { ouvertLe: number; creeeLe: number; nbDeblocages: number; dejaOfferte?: boolean },
  maintenant: number,
): boolean {
  return (
    e.nbDeblocages === 0 &&
    !e.dejaOfferte &&
    maintenant - e.ouvertLe >= DEMANDE_OFFERTE.apresH * H &&
    maintenant - e.creeeLe < DEMANDE_OFFERTE.fraicheurH * H
  );
}

export interface CandidatOffre {
  id: string;
  score: number;
  metiers: readonly string[];
  centre: { latitude: number; longitude: number };
  rayonKm: number;
  /** Une demande offerte par entreprise, une seule fois. */
  dejaBeneficiaire: boolean;
  temoin: boolean;
}

/** Artisans Gratuit du métier dont le rayon couvre le chantier, meilleurs scores d'abord. */
export function destinatairesDemandeOfferte(
  demande: { metier: string; geo: { latitude: number; longitude: number } },
  candidats: readonly CandidatOffre[],
): (CandidatOffre & { distanceKm: number })[] {
  return candidats
    .filter((c) => !c.dejaBeneficiaire && !c.temoin && c.metiers.includes(demande.metier))
    .map((c) => ({ ...c, distanceKm: Math.round(distanceKm(c.centre, demande.geo)) }))
    .filter((c) => c.distanceKm <= c.rayonKm)
    .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
    .slice(0, DEMANDE_OFFERTE.destinataires);
}
