import { noteBayesienne } from '../matching/score';

const borner = (x: number) => Math.min(1, Math.max(0, x));
const ANCIENNETE_MAX_ANS = 10;

export interface EntreeClassement {
  noteMoyenne: number;
  nbAvis: number;
  tauxReponse?: number;
  tempsReponseMoyenMin?: number;
  /** 0 à 100. */
  completude: number;
  delaiDispoJours?: number;
  anneesActivite?: number;
}

/**
 * `scoreClassement` de l'annuaire (MATCHING §4), sur 100 : 0,35 qualité + 0,25 réactivité +
 * 0,15 complétude + 0,15 disponibilité + 0,10 ancienneté (10 ans au plus). Donnée inconnue : 0,5.
 */
export function scoreClassement(a: EntreeClassement): number {
  const qualite = borner((noteBayesienne(a.noteMoyenne, a.nbAvis) - 3) / 2);
  const reactivite =
    a.tauxReponse === undefined
      ? 0.5
      : borner(
          0.6 * a.tauxReponse + 0.4 * (1 - Math.min(a.tempsReponseMoyenMin ?? 1440, 1440) / 1440),
        );
  const disponibilite = a.delaiDispoJours === undefined ? 0.5 : borner(1 - a.delaiDispoJours / 30);
  const anciennete =
    a.anneesActivite === undefined
      ? 0.5
      : Math.min(a.anneesActivite, ANCIENNETE_MAX_ANS) / ANCIENNETE_MAX_ANS;
  const score =
    0.35 * qualite +
    0.25 * reactivite +
    0.15 * borner(a.completude / 100) +
    0.15 * disponibilite +
    0.1 * anciennete;
  return Math.round(score * 10_000) / 100;
}
