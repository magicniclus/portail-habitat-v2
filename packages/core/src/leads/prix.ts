/**
 * Prix de déblocage d'un appel d'offres (DATABASE.md §5, formule du barème `grillesTarifaires`).
 * Tout est en centimes entiers HT ; le barème est passé en argument (lu côté serveur uniquement).
 */
export type TrancheBudget = 'S' | 'M' | 'L' | 'XL';
export type Urgence = 'normale' | 'rapide' | 'urgente';
export type Concurrence = 'faible' | 'normale' | 'forte';
export type NiveauLead = 'A' | 'B' | 'C';

export interface Bareme {
  /** Clé : identifiant du métier, ou à défaut sa famille de travaux (D47). */
  prixBaseParMetier: Readonly<Record<string, number>>;
  /** Prix de base quand ni le métier ni sa famille ne sont au barème (D47). */
  prixBaseDefaut: number;
  coefBudget: Readonly<Record<TrancheBudget, number>>;
  coefUrgence: Readonly<Record<Urgence, number>>;
  /** Paliers : le premier dont `min` ≤ qualité s'applique (ordre indifférent). */
  coefQualite: readonly { min: number; coef: number }[];
  coefConcurrence: Readonly<Record<Concurrence, number>>;
  /** Artisans éligibles dans la zone : ≤ faibleJusqua → faible, ≥ forteDes → forte (D47). */
  seuilsConcurrence: { faibleJusqua: number; forteDes: number };
  /** Demandes partenaires (IMPORT_LEADS.md) : niveau de qualification et éligibilité aux aides. */
  coefNiveau?: Readonly<Record<NiveauLead, number>>;
  coefEligibilite?: { eligible: number; non_eligible: number };
  remisePremium: number;
  centimesParCredit: number;
  plancher: number;
  plafond: number;
  arrondi: number;
}

export interface CaracteristiquesLead {
  metier: string;
  famille?: string;
  trancheBudget: TrancheBudget;
  urgence: Urgence;
  /** Score 0–100 (MATCHING.md §9). */
  qualiteLead: number;
  nbEligibles: number;
  niveau?: NiveauLead;
  eligibiliteAides?: 'eligible' | 'ampleur_seulement' | 'non_eligible';
}

export interface DetailCalcul {
  base: number;
  coefBudget: number;
  coefUrgence: number;
  coefQualite: number;
  coefConcurrence: number;
  coefNiveau: number;
  coefEligibilite: number;
}

export interface PrixLead {
  prixBaseCentimes: number;
  prixPremiumCentimes: number;
  prixCredits: number;
  detailCalcul: DetailCalcul;
}

const EUR = 100;
/** Bornes des tranches de budget : < 5 k€, 5–20 k€, 20–60 k€, > 60 k€. */
const TRANCHES: readonly [number, TrancheBudget][] = [
  [5_000 * EUR, 'S'],
  [20_000 * EUR, 'M'],
  [60_000 * EUR, 'L'],
];

/** Tranche de budget d'une estimation, sur le milieu de la fourchette (D47). */
export function trancheBudget(minCentimes: number, maxCentimes: number): TrancheBudget {
  const milieu = (minCentimes + maxCentimes) / 2;
  return TRANCHES.find(([borne]) => milieu < borne)?.[1] ?? 'XL';
}

export function niveauConcurrence(nbEligibles: number, b: Bareme): Concurrence {
  if (nbEligibles <= b.seuilsConcurrence.faibleJusqua) return 'faible';
  if (nbEligibles >= b.seuilsConcurrence.forteDes) return 'forte';
  return 'normale';
}

export function coefQualite(qualite: number, paliers: Bareme['coefQualite']): number {
  const tries = [...paliers].sort((a, b) => b.min - a.min);
  return tries.find((p) => qualite >= p.min)?.coef ?? tries[tries.length - 1]?.coef ?? 1;
}

/** Arrondi au multiple le plus proche (100 = à l'euro), en centimes entiers. */
export const arrondir = (centimes: number, pas: number) =>
  Math.round(Math.round(centimes) / pas) * pas;

const borner = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

/** Prix automatique (mode `auto`) : formule de DATABASE.md §5. */
export function calculerPrixLead(l: CaracteristiquesLead, b: Bareme): PrixLead {
  const detailCalcul: DetailCalcul = {
    base:
      b.prixBaseParMetier[l.metier] ??
      (l.famille ? b.prixBaseParMetier[l.famille] : undefined) ??
      b.prixBaseDefaut,
    coefBudget: b.coefBudget[l.trancheBudget],
    coefUrgence: b.coefUrgence[l.urgence],
    coefQualite: coefQualite(l.qualiteLead, b.coefQualite),
    coefConcurrence: b.coefConcurrence[niveauConcurrence(l.nbEligibles, b)],
    coefNiveau: l.niveau && b.coefNiveau ? b.coefNiveau[l.niveau] : 1,
    coefEligibilite:
      l.eligibiliteAides && b.coefEligibilite
        ? b.coefEligibilite[l.eligibiliteAides === 'non_eligible' ? 'non_eligible' : 'eligible']
        : 1,
  };
  const d = detailCalcul;
  const brut =
    d.base *
    d.coefBudget *
    d.coefUrgence *
    d.coefQualite *
    d.coefConcurrence *
    d.coefNiveau *
    d.coefEligibilite;
  const prix = arrondir(borner(brut, b.plancher, b.plafond), b.arrondi);
  return {
    prixBaseCentimes: prix,
    prixPremiumCentimes: arrondir(prix * (1 - b.remisePremium), b.arrondi),
    prixCredits: Math.ceil(prix / b.centimesParCredit),
    detailCalcul,
  };
}

export interface TarificationLead {
  mode: 'auto' | 'manuel' | 'gratuit';
  prixBaseCentimes: number;
  prixPremiumCentimes: number;
  prixCredits: number;
  promo?: { pourcentage: number; jusquau: Date };
}

export interface PrixDeblocage {
  centimes: number;
  credits: number;
  promo: boolean;
}

/**
 * Prix payé au déblocage (MATCHING.md [8]) : Premium → prix Premium, sinon prix de base,
 * promo en cours appliquée au prix en euros et en crédits, arrondie à l'euro (D47). Figé ensuite dans `achatsLeads`.
 */
export function prixDeblocage(
  t: TarificationLead,
  o: { premium: boolean; maintenant: Date; arrondi?: number },
): PrixDeblocage {
  if (t.mode === 'gratuit') return { centimes: 0, credits: 0, promo: false };
  const centimes = o.premium ? t.prixPremiumCentimes : t.prixBaseCentimes;
  const promo = t.promo && o.maintenant < t.promo.jusquau ? t.promo.pourcentage : 0;
  if (!promo) return { centimes, credits: t.prixCredits, promo: false };
  return {
    centimes: arrondir((centimes * (100 - promo)) / 100, o.arrondi ?? 100),
    credits: Math.ceil((t.prixCredits * (100 - promo)) / 100),
    promo: true,
  };
}
