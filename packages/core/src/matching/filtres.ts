import type { ArtisanMatching, DemandeMatching, Point, RaisonExclusion } from './types';

const RAYON_TERRE_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance à vol d'oiseau (haversine), en km. */
export function distanceKm(a: Point, b: Point): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rayon effectif : celui de l'artisan (10–100 km), borné par la configuration. */
export const rayonEffectif = (a: ArtisanMatching, rayonMaxKm: number) =>
  Math.min(a.rayonKm, rayonMaxKm);

/** Compétence : l'intention de la demande, sinon repli sur le métier (COMPTES §3.1 bis). */
export function estCompetent(a: ArtisanMatching, d: DemandeMatching): boolean {
  if (d.intention && a.intentions.includes(d.intention)) return true;
  return a.metierPrincipal === d.metierRequis || a.metiersSecondaires.includes(d.metierRequis);
}

export interface ContexteFiltres {
  rayonMaxKm: number;
  /** Artisans déjà sollicités ou ayant refusé pour cette demande (réattribution). */
  dejaVus: ReadonlySet<string>;
}

/**
 * Candidats [2] puis filtres durs [3], dans l'ordre du tableau de MATCHING.md :
 * renvoie la première raison d'exclusion, ou null si l'artisan reste candidat.
 */
export function raisonExclusion(
  a: ArtisanMatching,
  d: DemandeMatching,
  distance: number,
  ctx: ContexteFiltres,
): RaisonExclusion | null {
  if (!estCompetent(a, d)) return 'metier';
  if (distance > rayonEffectif(a, ctx.rayonMaxKm)) return 'distance';
  if (!a.verifie) return 'non_verifie';
  if (a.decennaleExpireLe === undefined || a.decennaleExpireLe <= d.demarrageLe) return 'assurance';
  const manquante = d.exigences.find((x) => !a.qualifications.includes(x));
  if (manquante) return `exigence:${manquante}`;
  if (a.sanctionActive) return 'sanction';
  if (a.demandesRecuesMois >= a.quotaDemandesMois) return 'quota';
  if (ctx.dejaVus.has(a.id)) return 'deja_vu';
  if (a.empreintes.some((e) => d.empreintesDemandeur.includes(e))) return 'conflit';
  if (a.enPause) return 'pause';
  if (
    d.budgetMaxCentimes !== undefined &&
    a.budgetMinCentimes !== undefined &&
    d.budgetMaxCentimes < a.budgetMinCentimes * 0.5
  )
    return 'budget';
  return null;
}
