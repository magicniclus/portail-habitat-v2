/** Envois minimum par variante avant de conclure. */
const MIN_ENVOIS = 200;
/** Seuil bilatéral à 95 % de confiance. */
const Z_95 = 1.96;

/**
 * Test A/B d'un modèle (CONVERSION §5) : test de deux proportions sur le taux de clic entre la
 * meilleure variante et la deuxième ; un gagnant seulement si l'écart est significatif à 95 %.
 */
export function gagnantAB(
  stats: readonly { variante: string; envois: number; clics: number }[],
): string | null {
  if (stats.length < 2 || stats.some((s) => s.envois < MIN_ENVOIS)) return null;
  const [a, b] = [...stats].sort((x, y) => y.clics / y.envois - x.clics / x.envois);
  const p = (a!.clics + b!.clics) / (a!.envois + b!.envois);
  const ecart = Math.sqrt(p * (1 - p) * (1 / a!.envois + 1 / b!.envois));
  if (ecart === 0) return null;
  const z = (a!.clics / a!.envois - b!.clics / b!.envois) / ecart;
  return z >= Z_95 ? a!.variante : null;
}
