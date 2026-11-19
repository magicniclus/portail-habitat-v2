/** Millimètres du plan → mètres de la 3D. Plan (x, y) → 3D (x, z), hauteur → y. */
export const M = (mm: number) => mm / 1000;

/** Mètres de la 3D → millimètres entiers du plan (glisser un meuble en 3D). */
export const versMm = (m: number) => Math.round(m * 1000);
