/**
 * Modèles et coût d'un appel (IA_ADMIN §3, COUTS.md) : Haiku par défaut, Sonnet pour l'analyse
 * approfondie et la synthèse du lundi. Prix publics en dollars par million de jetons.
 */
export const MODELES_IA = {
  'claude-haiku-4-5': { entree: 1, sortie: 5 },
  'claude-sonnet-5-5': { entree: 2, sortie: 10 },
} as const;
export type ModeleIa = keyof typeof MODELES_IA;
export const MODELE_DEFAUT: ModeleIa = 'claude-haiku-4-5';
export const MODELE_APPROFONDI: ModeleIa = 'claude-sonnet-5-5';

/** Conversion prudente dollars → euros pour le budget (arrondie au-dessus). */
export const EUROS_PAR_DOLLAR = 0.95;

export interface UsageIa {
  entree: number;
  sortie: number;
  /** Jetons écrits dans le cache (facturés 1,25 ×) et lus depuis le cache (0,1 ×). */
  cacheEcrit: number;
  cacheLu: number;
}

/** Coût en centimes d'euro, arrondi au centime supérieur (jamais sous-estimé). */
export function coutCentimes(modele: string, u: UsageIa): number {
  const p = MODELES_IA[modele as ModeleIa] ?? MODELES_IA[MODELE_APPROFONDI];
  const dollars =
    ((u.entree + u.cacheEcrit * 1.25 + u.cacheLu * 0.1) * p.entree + u.sortie * p.sortie) / 1e6;
  return Math.ceil(dollars * EUROS_PAR_DOLLAR * 100);
}
