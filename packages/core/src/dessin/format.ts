import { formatNombre } from '../format/nombres';

/** Affichage des mesures de Dessin (millimètres entiers en entrée). */
export type UniteAffichage = 'cm' | 'm';

/** « 10,60 m » ou « 1 060 cm ». */
export const formatLongueur = (mm: number, unite: UniteAffichage = 'm'): string =>
  unite === 'cm' ? `${formatNombre(Math.round(mm / 10))} cm` : `${formatNombre(mm / 1000, 2)} m`;

/** « 80,0 m² » (entrée en mm²). */
export const formatSurface = (mm2: number): string => `${formatNombre(mm2 / 1_000_000, 1)} m²`;

/** « 3° » ou « 12,5° » (entrée en dixièmes de degré). */
export const formatAngle = (dixiemes: number): string =>
  `${formatNombre(dixiemes / 10, dixiemes % 10 === 0 ? 0 : 1)}°`;

/** « 45,0 m³ » (entrée en litres). */
export const formatVolume = (litres: number): string => `${formatNombre(litres / 1000, 1)} m³`;

/**
 * Saisie d'une mesure (« 12,5 » cm ou « 2,75 » m) → millimètres entiers ; `null` si le champ
 * est vide, illisible ou négatif (rien n'est alors appliqué, jamais 0 par erreur).
 */
export function lireMesure(saisie: string, unite: 'cm' | 'm'): number | null {
  const texte = saisie.trim().replace(/\s/g, '').replace(',', '.');
  if (!texte) return null;
  const v = Number(texte);
  if (!Number.isFinite(v) || v < 0) return null;
  return unite === 'cm' ? Math.round(v * 10) : Math.round(v * 100) * 10;
}
