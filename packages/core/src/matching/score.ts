import { rayonEffectif } from './filtres';
import type {
  Ajustements,
  ArtisanMatching,
  ConfigMatching,
  DemandeMatching,
  SousScores,
} from './types';

const borner = (x: number) => Math.min(1, Math.max(0, x));
const normaliser = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Moyenne bayésienne de la plateforme (§4). */
const NOTE_MOYENNE_PLATEFORME = 4.3;
const POIDS_PRIOR = 5;

export function noteBayesienne(note: number, nbAvis: number): number {
  return (POIDS_PRIOR * NOTE_MOYENNE_PLATEFORME + nbAvis * note) / (POIDS_PRIOR + nbAvis);
}

/** Sous-scores normalisés entre 0 et 1 (MATCHING.md §3 [4]). */
export function sousScores(
  a: ArtisanMatching,
  d: DemandeMatching,
  distance: number,
  c: ConfigMatching,
): SousScores {
  const mots = d.motsReponses.map(normaliser).join(' | ');
  const tags = a.tags.filter((t) => normaliser(t) && mots.includes(normaliser(t))).length;
  const base = a.metierPrincipal === d.metierRequis ? 1 : 0.8;
  const rayon = rayonEffectif(a, c.rayonMaxKm);

  let adequationBudget = 0.5;
  const [dMin, dMax, aMin, aMax] = [
    d.budgetMinCentimes,
    d.budgetMaxCentimes,
    a.budgetMinCentimes,
    a.budgetMaxCentimes,
  ];
  if (dMin !== undefined && dMax !== undefined && aMin !== undefined && aMax !== undefined) {
    const chevauchement = Math.max(0, Math.min(aMax, dMax) - Math.max(aMin, dMin));
    adequationBudget =
      dMax > dMin ? chevauchement / (dMax - dMin) : dMin >= aMin && dMin <= aMax ? 1 : 0;
  }

  let disponibilite = 1;
  if (
    d.delaiSouhaiteJours !== null &&
    a.delaiDispoJours !== undefined &&
    a.delaiDispoJours > d.delaiSouhaiteJours
  )
    disponibilite = Math.max(0, 1 - (a.delaiDispoJours - d.delaiSouhaiteJours) / 30);

  return {
    competence: borner(base + 0.1 * tags),
    distance: borner(1 - (distance / rayon) ** 1.3),
    qualite: borner(
      borner((noteBayesienne(a.note, a.nbAvis) - 3) / 2) + a.tauxRecommandation * 0.2,
    ),
    reactivite: borner(
      0.6 * a.tauxReponse + 0.4 * (1 - Math.min(a.tempsReponseMoyenMin, 1440) / 1440),
    ),
    disponibilite,
    adequationBudget: borner(adequationBudget),
    completude: borner(a.completude / 100),
  };
}

export function ajustements(a: ArtisanMatching, c: ConfigMatching): Ajustements {
  return {
    premium: a.premium ? c.bonusPremium : 0,
    visibilite: a.optionVisibilite ? c.bonusVisibilite : 0,
    saturation:
      a.attributions7j > c.penaliteSaturation.seuilDemandes7j ? -c.penaliteSaturation.points : 0,
    refus: a.tauxRefus30j > c.penaliteRefus.tauxSeuil ? -c.penaliteRefus.points : 0,
    nouveau:
      a.verifie && a.joursDepuisVerification <= c.nouvelArtisanBoost.joursMax
        ? c.nouvelArtisanBoost.points
        : 0,
  };
}

/** Score final : somme pondérée × 100 plus ajustements, arrondi au centième (déterminisme). */
export function scoreFinal(s: SousScores, aj: Ajustements, c: ConfigMatching): number {
  const pondere = (Object.keys(c.poids) as (keyof SousScores)[]).reduce(
    (t, k) => t + c.poids[k] * s[k],
    0,
  );
  const points = aj.premium + aj.visibilite + aj.saturation + aj.refus + aj.nouveau;
  return Math.round((pondere * 100 + points) * 100) / 100;
}
