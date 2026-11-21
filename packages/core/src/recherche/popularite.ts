/**
 * Popularité des intentions (RECHERCHE §2, 1 à 5) recalculée chaque mois à partir des demandes
 * réelles : classement par nombre de demandes, découpé en cinq parts égales ; une intention sans
 * demande vaut 1. Sous `minimum` demandes au total, rien ne change (`null`).
 */
export function popularitesIntentions(
  comptes: Readonly<Record<string, number>>,
  ids: readonly string[],
  minimum: number,
): Record<string, number> | null {
  const total = ids.reduce((n, id) => n + (comptes[id] ?? 0), 0);
  if (total < minimum) return null;
  const actives = ids
    .filter((id) => (comptes[id] ?? 0) > 0)
    .sort((a, b) => comptes[b]! - comptes[a]! || a.localeCompare(b));
  const res: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 1]));
  actives.forEach((id, rang) => {
    res[id] = 5 - Math.floor((rang * 5) / actives.length);
  });
  return res;
}
