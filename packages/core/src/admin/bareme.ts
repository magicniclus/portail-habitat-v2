import { calculerPrixLead, type Bareme, type CaracteristiquesLead } from '../leads/prix';

/**
 * Édition d'un barème (ADMIN §2.5) : saisie en euros entiers et en pourcentages, convertie en
 * centimes. Les paliers de qualité, de concurrence, de niveau et d'aides restent ceux du barème
 * actif (non modifiables depuis l'écran pour l'instant).
 */
export interface SaisieBareme {
  prixBaseParMetier: Record<string, number>;
  prixBaseDefaut: number;
  coefBudget: Bareme['coefBudget'];
  coefUrgence: Bareme['coefUrgence'];
  remisePremiumPourcent: number;
  eurosParCredit: number;
  plancher: number;
  plafond: number;
}

const enEuros = (c: number) => c / 100;
const enCentimes = (e: number) => Math.round(e * 100);

export function saisieDepuisBareme(b: Bareme): SaisieBareme {
  return {
    prixBaseParMetier: Object.fromEntries(
      Object.entries(b.prixBaseParMetier).map(([k, v]) => [k, enEuros(v)]),
    ),
    prixBaseDefaut: enEuros(b.prixBaseDefaut),
    coefBudget: { ...b.coefBudget },
    coefUrgence: { ...b.coefUrgence },
    remisePremiumPourcent: Math.round(b.remisePremium * 100),
    eurosParCredit: enEuros(b.centimesParCredit),
    plancher: enEuros(b.plancher),
    plafond: enEuros(b.plafond),
  };
}

export function baremeDepuisSaisie(s: SaisieBareme, actif: Bareme): Bareme {
  return {
    ...actif,
    prixBaseParMetier: Object.fromEntries(
      Object.entries(s.prixBaseParMetier).map(([k, v]) => [k, enCentimes(v)]),
    ),
    prixBaseDefaut: enCentimes(s.prixBaseDefaut),
    coefBudget: { ...s.coefBudget },
    coefUrgence: { ...s.coefUrgence },
    remisePremium: s.remisePremiumPourcent / 100,
    centimesParCredit: enCentimes(s.eurosParCredit),
    plancher: enCentimes(s.plancher),
    plafond: enCentimes(s.plafond),
  };
}

export interface LeadSimule {
  id: string;
  titre: string;
  caracteristiques: CaracteristiquesLead;
}

export interface SimulationBareme {
  lignes: { id: string; titre: string; avant: number; apres: number; ecart: number }[];
  moyenneAvant: number;
  moyenneApres: number;
  hausses: number;
  baisses: number;
}

const moyenne = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

/** ADM-05 : prix automatique de chaque lead avec le barème actif puis avec le nouveau. */
export function simulerBareme(
  leads: readonly LeadSimule[],
  actif: Bareme,
  nouveau: Bareme,
): SimulationBareme {
  const lignes = leads.map((l) => {
    const avant = calculerPrixLead(l.caracteristiques, actif).prixBaseCentimes;
    const apres = calculerPrixLead(l.caracteristiques, nouveau).prixBaseCentimes;
    return { id: l.id, titre: l.titre, avant, apres, ecart: apres - avant };
  });
  return {
    lignes,
    moyenneAvant: moyenne(lignes.map((l) => l.avant)),
    moyenneApres: moyenne(lignes.map((l) => l.apres)),
    hausses: lignes.filter((l) => l.ecart > 0).length,
    baisses: lignes.filter((l) => l.ecart < 0).length,
  };
}
