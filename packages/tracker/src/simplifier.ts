/**
 * Simplification d'un trajet (Ramer-Douglas-Peucker borné) : on part des extrémités et on
 * ajoute à chaque tour le point le plus éloigné de son segment, jusqu'à `max` points.
 * `points` est une liste aplatie `[x0, y0, x1, y1, …]`.
 */
export function simplifier(points: readonly number[], max: number): number[] {
  const n = points.length / 2;
  if (n <= max) return [...points];
  const garde = new Uint8Array(n);
  garde[0] = garde[n - 1] = 1;
  for (let gardes = 2; gardes < max; gardes++) {
    let meilleur = -1;
    let distanceMax = -1;
    let debut = 0;
    for (let i = 1; i < n; i++) {
      if (!garde[i]) continue;
      for (let j = debut + 1; j < i; j++) {
        const d = distance(points, j, debut, i);
        if (d > distanceMax) [distanceMax, meilleur] = [d, j];
      }
      debut = i;
    }
    garde[meilleur] = 1;
  }
  return points.filter((_, k) => garde[k >> 1]);
}

/** Distance du point `p` au segment `a`–`b`. */
function distance(pts: readonly number[], p: number, a: number, b: number) {
  const [ax, ay, bx, by, px, py] = [
    pts[2 * a]!,
    pts[2 * a + 1]!,
    pts[2 * b]!,
    pts[2 * b + 1]!,
    pts[2 * p]!,
    pts[2 * p + 1]!,
  ];
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
