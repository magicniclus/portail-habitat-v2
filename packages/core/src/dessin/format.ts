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

/** « 45 000 L » (entrée en litres). */
export const formatVolume = (litres: number): string => `${formatNombre(litres)} L`;
