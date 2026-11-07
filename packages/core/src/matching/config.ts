import type { ConfigMatching } from './types';

/** Configuration complète (`matchingConfig/actif`, MATCHING §2) : score + attribution + relances. */
export interface ConfigMatchingComplete extends ConfigMatching {
  nbCibles: number;
  vagueSupplementaire: number;
  delaiAcceptationH: number;
  delaiAcceptationUrgentH: number;
  convertirEnAppelOffres: boolean;
  delaiAvantAppelOffresH: number;
}

/** Valeurs initiales (docs/data/matching-config.json) ; l'admin les surcharge au lot 13. */
export const CONFIG_MATCHING_DEFAUT: ConfigMatchingComplete = {
  version: 7,
  nbCibles: 3,
  nbPropositionsInitiales: 3,
  vagueSupplementaire: 2,
  delaiAcceptationH: 24,
  delaiAcceptationUrgentH: 4,
  rayonMaxKm: 60,
  poids: {
    competence: 0.25,
    distance: 0.2,
    qualite: 0.2,
    reactivite: 0.15,
    disponibilite: 0.1,
    adequationBudget: 0.05,
    completude: 0.05,
  },
  bonusPremium: 12,
  bonusVisibilite: 4,
  quotaPremiumMax: 2,
  garantirUnNonPremium: true,
  penaliteSaturation: { seuilDemandes7j: 8, points: 10 },
  penaliteRefus: { tauxSeuil: 0.5, points: 8 },
  nouvelArtisanBoost: { joursMax: 30, points: 6 },
  scoreMin: 35,
  convertirEnAppelOffres: true,
  delaiAvantAppelOffresH: 24,
};
