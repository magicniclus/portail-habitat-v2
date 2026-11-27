/**
 * Plafond réel d'une limite de débit : aucune limite sous `pnpm dev` (essais répétés en local),
 * sinon le plafond prévu multiplié par `RATE_LIMIT_FACTEUR` (entier ≥ 1, pour une recette ou un pic).
 */
export function plafondEffectif(
  max: number,
  env: Record<string, string | undefined>,
): number | null {
  if (env.NODE_ENV === 'development') return null;
  const facteur = Number(env.RATE_LIMIT_FACTEUR);
  return Number.isInteger(facteur) && facteur >= 1 ? max * facteur : max;
}
