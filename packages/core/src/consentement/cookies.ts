import { z } from '../zod';

/** Cookie first-party qui mémorise le choix (strictement nécessaire, exempté de consentement). */
export const COOKIE_CONSENTEMENT = 'ph_consentement';

/** Le choix est redemandé tous les 6 mois (INTEGRATIONS §7, recommandation CNIL). */
export const DUREE_CONSENTEMENT_MS = 182 * 86_400_000;

export interface Consentement {
  /** Catégorie « Mesure d'audience détaillée » (COMPORTEMENT §7), refusée par défaut. */
  audienceDetaillee: boolean;
  le: number;
}

const stocke = z.object({
  v: z.literal(1),
  a: z.union([z.literal(0), z.literal(1)]),
  le: z.number().int(),
});

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
  const r = stocke.safeParse(brut);
  if (!r.success) return null;
  const { a, le } = r.data;
  if (le > maintenant || maintenant - le >= DUREE_CONSENTEMENT_MS) return null;
  return { audienceDetaillee: a === 1, le };
}
