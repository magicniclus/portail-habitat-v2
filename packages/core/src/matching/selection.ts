import { distanceKm, raisonExclusion } from './filtres';
import { ajustements, scoreFinal, sousScores } from './score';
import type { ArtisanMatching, Candidat, ConfigMatching, DemandeMatching } from './types';

/** Évalue tous les artisans : raison d'exclusion consignée, ou sous-scores et score. */
export function evaluer(
  artisans: readonly ArtisanMatching[],
  d: DemandeMatching,
  c: ConfigMatching,
  dejaVus: ReadonlySet<string> = new Set(),
): Candidat[] {
  return artisans.map((a) => {
    const distance = Math.round(distanceKm(a.geo, d.geo) * 100) / 100;
    const commun = {
      artisanId: a.id,
      siren: a.siren,
      premium: a.premium,
      distance,
      derniereAttributionLe: a.derniereAttributionLe,
    };
    const raison = raisonExclusion(a, d, distance, { rayonMaxKm: c.rayonMaxKm, dejaVus });
    if (raison) return { ...commun, score: 0, raisonExclusion: raison };
    const s = sousScores(a, d, distance, c);
    const aj = ajustements(a, c);
    const score = scoreFinal(s, aj, c);
    return {
      ...commun,
      sousScores: s,
      ajustements: aj,
      score,
      ...(score < c.scoreMin ? { raisonExclusion: 'score_faible' as const } : {}),
    };
  });
}

/** Tri : score décroissant, puis distance, puis dernière attribution la plus ancienne, puis identifiant. */
export function comparer(a: Candidat, b: Candidat): number {
  return (
    b.score - a.score ||
    a.distance - b.distance ||
    (a.derniereAttributionLe ?? -Infinity) - (b.derniereAttributionLe ?? -Infinity) ||
    (a.artisanId < b.artisanId ? -1 : a.artisanId > b.artisanId ? 1 : 0)
  );
}

export const eligibles = (candidats: readonly Candidat[]) =>
  candidats.filter((x) => !x.raisonExclusion).sort(comparer);

/**
 * Sélection équitable [5] : au plus `quotaPremiumMax` Premium, au moins un non-Premium s'il en existe
 * un éligible, jamais deux artisans du même SIREN, `artisanCibleId` en rang 1 s'il est éligible.
 */
export function selectionner(
  candidats: readonly Candidat[],
  c: ConfigMatching,
  n: number,
  artisanCibleId?: string,
): Candidat[] {
  const tries = eligibles(candidats);
  const cible = tries.find((x) => x.artisanId === artisanCibleId);
  const retenus: Candidat[] = cible ? [cible] : [];
  const nonPremiumDisponible = (deja: Candidat[]) =>
    tries.some((x) => !x.premium && !deja.includes(x) && !deja.some((r) => r.siren === x.siren));

  for (const x of tries) {
    if (retenus.length >= n) break;
    if (retenus.includes(x) || retenus.some((r) => r.siren === x.siren)) continue;
    if (x.premium) {
      if (retenus.filter((r) => r.premium).length >= c.quotaPremiumMax) continue;
      const resteUnePlace = retenus.length === n - 1;
      if (
        c.garantirUnNonPremium &&
        resteUnePlace &&
        retenus.every((r) => r.premium) &&
        nonPremiumDisponible(retenus)
      )
        continue;
    }
    retenus.push(x);
  }
  return retenus;
}

export type Aiguillage =
  { canal: 'garantie'; artisan: Candidat } | { canal: 'appel_offres'; eligibles: Candidat[] };

/**
 * Aiguillage d'une demande du site (D31, D56) : envoyée depuis la fiche d'un artisan éligible,
 * elle est pour lui seul (canal `garantie`, gratuite, quelle que soit sa formule) ; sinon appel
 * d'offres ouvert aux éligibles (3 réponses au plus). Les demandes garanties Premium n'existent
 * plus (PAIEMENTS §2).
 */
export function aiguiller(candidats: readonly Candidat[], artisanCibleId?: string): Aiguillage {
  const tries = eligibles(candidats);
  const cible = tries.find((x) => x.artisanId === artisanCibleId);
  if (cible) return { canal: 'garantie', artisan: cible };
  return { canal: 'appel_offres', eligibles: tries };
}
