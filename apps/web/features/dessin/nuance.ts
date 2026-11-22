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
