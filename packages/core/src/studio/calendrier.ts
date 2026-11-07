/**
 * Calendrier de publication (STUDIO.md §11) : créneaux répartis dans la journée. Sans statistiques,
 * répartition régulière de 8 h à 21 h ; dès que vos vidéos ont des résultats, les heures qui
 * marchent le mieux passent devant (`meilleuresHeures`). Minutes depuis minuit, heure locale.
 */
export const PLAGE_DEFAUT = { debut: 8 * 60, fin: 21 * 60 } as const;

/** `nombre` créneaux régulièrement espacés dans la plage (arrondis au quart d'heure). */
export function creneauxDuJour(
  nombre: number,
  plage: { debut: number; fin: number } = PLAGE_DEFAUT,
  heures: readonly number[] = [],
): number[] {
  if (nombre <= 0) return [];
  const favoris = heures.slice(0, nombre).map((h) => h * 60);
  const reste = nombre - favoris.length;
  const pas = (plage.fin - plage.debut) / Math.max(1, reste);
  const reguliers = Array.from(
    { length: reste },
    (_, i) => Math.round((plage.debut + pas * (i + 0.5)) / 15) * 15,
  );
  return [...new Set([...favoris, ...reguliers])].sort((a, b) => a - b);
}

/**
 * Premier créneau libre à partir de `apres` (minutes du jour) : un créneau est pris s'il y a déjà
 * une publication à moins de `ecart` minutes. `null` : plus de place ce jour-là.
 */
export function prochainCreneau(
  creneaux: readonly number[],
  occupes: readonly number[],
  apres: number,
  ecart = 30,
): number | null {
  return creneaux.find((c) => c > apres && occupes.every((o) => Math.abs(o - c) >= ecart)) ?? null;
}

/**
 * Heures (0 à 23) classées par résultat moyen de vos vidéos publiées à cette heure-là, au moins
 * `minimum` vidéos par heure pour compter. Vide tant qu'il n'y a pas assez de recul.
 */
export function meilleuresHeures(
  publications: readonly { heure: number; score: number }[],
  minimum = 2,
): number[] {
  const parHeure = new Map<number, number[]>();
  for (const p of publications) parHeure.set(p.heure, [...(parHeure.get(p.heure) ?? []), p.score]);
  return [...parHeure]
    .filter(([, s]) => s.length >= minimum)
    .map(([h, s]) => [h, s.reduce((a, b) => a + b, 0) / s.length] as const)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([h]) => h);
}
