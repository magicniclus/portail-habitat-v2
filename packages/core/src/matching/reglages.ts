import type { ConfigMatchingComplete } from './config';

/**
 * Réglages de l'algorithme édités dans l'admin (ADMIN §2.10) : `matchingConfig/actif` garde les
 * poids, les seuils numériques (clés à point pour les pénalités) et les options booléennes.
 */
export interface DocumentConfigMatching {
  version: number;
  poids: Record<string, number>;
  seuils: Record<string, number>;
  options?: Record<string, boolean>;
}

const SEUILS = [
  'nbCibles',
  'nbPropositionsInitiales',
  'vagueSupplementaire',
  'delaiAcceptationH',
  'delaiAcceptationUrgentH',
  'rayonMaxKm',
  'bonusPremium',
  'bonusVisibilite',
  'quotaPremiumMax',
  'scoreMin',
  'delaiAvantAppelOffresH',
] as const;
const PENALITES = ['penaliteSaturation', 'penaliteRefus', 'nouvelArtisanBoost'] as const;
const OPTIONS = ['garantirUnNonPremium', 'convertirEnAppelOffres'] as const;

export function documentDepuisConfig(c: ConfigMatchingComplete): DocumentConfigMatching {
  const seuils: Record<string, number> = Object.fromEntries(SEUILS.map((k) => [k, c[k]]));
  for (const p of PENALITES) for (const [k, v] of Object.entries(c[p])) seuils[`${p}.${k}`] = v;
  return {
    version: c.version,
    poids: { ...c.poids },
    seuils,
    options: Object.fromEntries(OPTIONS.map((k) => [k, c[k]])),
  };
}

export function configDepuisDocument(
  d: DocumentConfigMatching,
  defaut: ConfigMatchingComplete,
): ConfigMatchingComplete {
  const s = d.seuils;
  const val = (k: string, v: number) => (typeof s[k] === 'number' ? s[k] : v);
  const penalite = <P extends (typeof PENALITES)[number]>(p: P) =>
    Object.fromEntries(
      Object.entries(defaut[p]).map(([k, v]) => [k, val(`${p}.${k}`, v)]),
    ) as ConfigMatchingComplete[P];
  return {
    ...defaut,
    ...Object.fromEntries(SEUILS.map((k) => [k, val(k, defaut[k])])),
    ...Object.fromEntries(OPTIONS.map((k) => [k, d.options?.[k] ?? defaut[k]])),
    version: d.version,
    poids: { ...defaut.poids, ...d.poids },
    penaliteSaturation: penalite('penaliteSaturation'),
    penaliteRefus: penalite('penaliteRefus'),
    nouvelArtisanBoost: penalite('nouvelArtisanBoost'),
  };
}

/** Saisie de l'écran : poids en pourcentages entiers (total 100). */
export interface SaisieConfigMatching {
  poids: ConfigMatchingComplete['poids'];
  seuils: Record<(typeof SEUILS)[number], number>;
  options: Record<(typeof OPTIONS)[number], boolean>;
}

export function saisieDepuisConfig(c: ConfigMatchingComplete): SaisieConfigMatching {
  return {
    poids: Object.fromEntries(
      Object.entries(c.poids).map(([k, v]) => [k, Math.round(v * 100)]),
    ) as SaisieConfigMatching['poids'],
    seuils: Object.fromEntries(SEUILS.map((k) => [k, c[k]])) as SaisieConfigMatching['seuils'],
    options: Object.fromEntries(OPTIONS.map((k) => [k, c[k]])) as SaisieConfigMatching['options'],
  };
}

export function configDepuisSaisie(
  s: SaisieConfigMatching,
  actuelle: ConfigMatchingComplete,
): ConfigMatchingComplete {
  return {
    ...actuelle,
    ...s.seuils,
    ...s.options,
    poids: Object.fromEntries(
      Object.entries(s.poids).map(([k, v]) => [k, v / 100]),
    ) as ConfigMatchingComplete['poids'],
  };
}

export const SEUILS_MATCHING = SEUILS;
