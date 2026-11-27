/** Teinte assombrie (k < 1 : interstices entre lames) ou éclaircie (k > 1), en `rgb()`. */
export function nuance(hex: string, k: number): string {
  const v = parseInt(hex.slice(1, 7), 16);
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) =>
    Math.max(0, Math.min(255, Math.round(x * k))),
  );
  return `rgb(${c.join(',')})`;
}

/** Terrasses en lames (bois, composite) : lames longues, interstice sombre (2D et 3D). */
export const PLANCHER = new Set(['bois', 'composite']);
/** Lame de terrasse par défaut (mm) : 3,60 m × 14,5 cm. */
export const LAME_TERRASSE = { l: 3_600, p: 145 } as const;

/**
 * Aboutements des lames de terrasse (pose à joints croisés) : pour 8 rangs, positions des
 * raccords sur une longueur de deux lames (fraction de 0 à 1). Irréguliers, jamais alignés
 * d'un rang au suivant : pas d'escalier ni de damier.
 */
export const ABOUTEMENTS: readonly (readonly [number, number])[] = [
  [0.05, 0.55],
  [0.32, 0.81],
  [0.18, 0.66],
  [0.44, 0.93],
  [0.27, 0.72],
  [0.09, 0.6],
  [0.38, 0.87],
  [0.21, 0.7],
];
