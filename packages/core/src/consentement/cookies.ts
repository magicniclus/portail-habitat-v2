/** Cookie first-party qui mémorise le choix (strictement nécessaire, exempté de consentement). */
export const COOKIE_CONSENTEMENT = 'ph_consentement';

/** Le choix est redemandé tous les 6 mois (INTEGRATIONS §7, recommandation CNIL). */
export const DUREE_CONSENTEMENT_MS = 182 * 86_400_000;

export interface Consentement {
  /** Catégorie « Mesure d'audience détaillée » (COMPORTEMENT §7), refusée par défaut. */
  audienceDetaillee: boolean;
  le: number;
}

export function ecrireConsentement(
  choix: { audienceDetaillee: boolean },
  maintenant: number,
): string {
  return encodeURIComponent(
    JSON.stringify({ v: 1, a: choix.audienceDetaillee ? 1 : 0, le: maintenant }),
  );
}

/** `null` : aucun choix valable, le bandeau s'affiche et aucun traceur non essentiel ne démarre. */
export function lireConsentement(
  valeur: string | undefined,
  maintenant: number,
): Consentement | null {
  if (!valeur) return null;
  let brut: unknown;
  try {
    brut = JSON.parse(decodeURIComponent(valeur));
  } catch {
    return null;
  }
  // Validation manuelle : ce module part dans le JavaScript de chaque page (budget D46), sans Zod.
  if (typeof brut !== 'object' || brut === null) return null;
  const { v, a, le } = brut as Record<string, unknown>;
  if (v !== 1 || (a !== 0 && a !== 1) || !Number.isSafeInteger(le)) return null;
  if ((le as number) > maintenant || maintenant - (le as number) >= DUREE_CONSENTEMENT_MS)
    return null;
  return { audienceDetaillee: a === 1, le: le as number };
}
