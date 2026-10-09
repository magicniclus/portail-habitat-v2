import type { Bareme } from './prix';

/** Barème actif par défaut (docs/data/bareme-appels-offres.json, D47) ; `grillesTarifaires` le remplace au lot 13. */
export const BAREME_DEFAUT: Bareme = {
  prixBaseParMetier: {
    plomberie: 1500,
    chauffage: 2400,
    electricite: 1500,
    menuiseries: 2000,
    'sdb-cuisine': 2500,
    deco: 1200,
    toiture: 2500,
    isolation: 2200,
    sols: 1400,
    interieur: 1500,
    'gros-oeuvre': 2400,
    exterieur: 1900,
    depannage: 900,
    traitements: 1200,
    securite: 1500,
    renovation: 3900,
    moe: 3900,
    diag: 900,
  },
  prixBaseDefaut: 1500,
  coefBudget: {
    S: 0.8,
    M: 1,
    L: 1.5,
    XL: 2.2,
  },
  coefUrgence: {
    normale: 1,
    rapide: 1.15,
    urgente: 1.3,
  },
  coefQualite: [
    {
      min: 80,
      coef: 1.2,
    },
    {
      min: 50,
      coef: 1,
    },
    {
      min: 0,
      coef: 0.7,
    },
  ],
  coefConcurrence: {
    faible: 0.9,
    normale: 1,
    forte: 1.15,
  },
  seuilsConcurrence: {
    faibleJusqua: 2,
    forteDes: 8,
  },
  coefNiveau: {
    A: 1,
    B: 0.7,
    C: 0.4,
  },
  coefEligibilite: {
    eligible: 1.2,
    non_eligible: 0.9,
  },
  remisePremium: 0.3,
  centimesParCredit: 1000,
  plancher: 500,
  plafond: 9900,
  arrondi: 100,
};

export const GRILLE_DEFAUT = 'gironde-2026';
