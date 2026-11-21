import { noteBayesienne } from './score';

/**
 * Scores de nuit (MATCHING [10]) : réactivité de l'entreprise sur 90 jours glissants, recopiée sur
 * `artisans/{id}` pour le moteur et le classement. Les déblocages d'appels d'offres (choisis par
 * l'artisan) ne comptent pas comme des propositions.
 */

const JOUR_MS = 86_400_000;
const FENETRE_MS = 90 * JOUR_MS;

export interface AttributionScore {
  statut: string;
  proposeeLe: number;
  reponduLe?: number;
  appelOffresId?: string;
}

export interface ScoresNuit {
  nbProposees: number;
  tauxReponse?: number;
  tempsReponseMoyenMin?: number;
  tauxAcceptation?: number;
  tauxRefus?: number;
  expirations30j: number;
  attributions7j: number;
  tauxRefus30j: number;
}

function mediane(valeurs: number[]): number {
  const v = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

const ratio = (n: number, d: number) => (d ? n / d : 0);

export function scoresNuit(
  attributions: readonly AttributionScore[],
  maintenant: number,
): ScoresNuit {
  const proposees = attributions.filter(
    (a) => !a.appelOffresId && a.proposeeLe >= maintenant - FENETRE_MS,
  );
  const depuis = (jours: number) =>
    proposees.filter((a) => a.proposeeLe >= maintenant - jours * JOUR_MS);
  const mois = depuis(30);
  const base = {
    nbProposees: proposees.length,
    expirations30j: mois.filter((a) => a.statut === 'expiree').length,
    attributions7j: depuis(7).length,
    tauxRefus30j: ratio(mois.filter((a) => a.statut === 'refusee').length, mois.length),
  };
  // Les propositions encore en attente ne comptent pas : l'artisan a encore le temps de répondre.
  const closes = proposees.filter((a) => a.statut !== 'proposee');
  if (!closes.length) return base;
  const reponses = closes.filter((a) => a.reponduLe !== undefined);
  const compte = (s: string) => closes.filter((a) => a.statut === s).length;
  return {
    ...base,
    tauxReponse: ratio(reponses.length, closes.length),
    ...(reponses.length
      ? {
          tempsReponseMoyenMin: Math.round(
            mediane(reponses.map((a) => (a.reponduLe! - a.proposeeLe) / 60_000)),
          ),
        }
      : {}),
    tauxAcceptation: ratio(compte('acceptee'), closes.length),
    tauxRefus: ratio(compte('refusee'), closes.length),
  };
}

const AUTOS = ['rapide', 'recommande'];

/** Labels automatiques : `rapide` (médiane < 24 h), `recommande` (> 95 % et au moins 10 avis). */
export function labelsAuto(
  labels: readonly string[],
  s: { tempsReponseMoyenMin?: number },
  avis: { tauxRecommandation?: number; nbAvis: number },
): string[] {
  const rapide =
    s.tempsReponseMoyenMin === undefined
      ? labels.includes('rapide')
      : s.tempsReponseMoyenMin < 24 * 60;
  const recommande = (avis.tauxRecommandation ?? 0) > 0.95 && avis.nbAvis >= 10;
  return [
    ...labels.filter((l) => !AUTOS.includes(l)),
    ...(rapide ? ['rapide'] : []),
    ...(recommande ? ['recommande'] : []),
  ];
}

const pourcent = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 100);

/** Synthèse 0–100 pour l'administration (`artisanScores`) : qualité, réactivité, capacité. */
export function syntheseScores(
  s: ScoresNuit,
  a: { noteMoyenne: number; nbAvis: number },
): { qualite: number; reactivite: number; capacite: number } {
  return {
    qualite: pourcent((noteBayesienne(a.noteMoyenne, a.nbAvis) - 3) / 2),
    reactivite: pourcent(
      0.6 * (s.tauxReponse ?? 1) +
        0.4 * (1 - Math.min(s.tempsReponseMoyenMin ?? 1440, 1440) / 1440),
    ),
    capacite: pourcent(1 - s.attributions7j / 10),
  };
}
