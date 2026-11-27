import type { Agregat } from './agregation';

/**
 * Détection de nuit (COMPORTEMENT §4) : frictions et baisse de conversion sur 7 jours,
 * comparées aux 28 jours précédents. Aucune alerte sous 200 sessions.
 */
export type TypeAlerte = 'clic_mort' | 'rage' | 'hesitation' | 'sortie' | 'baisse_conversion';
export interface AlerteDetectee {
  type: TypeAlerte;
  element?: string;
  /** 1 (faible) à 5 (forte). */
  gravite: number;
  /** Taux observé sur 7 jours. */
  valeur: number;
  /** Seuil ou valeur de comparaison. */
  reference: number;
}

export const SEUILS_DETECTION = {
  sessionsMin: 200,
  clicsMorts: 0.02,
  rages: 0.005,
  hesitations: 0.1,
  /** Une section fait partir quand son taux de sortie dépasse 1,5 fois la moyenne des sections. */
  sortieRelative: 1.5,
  sortiesMin: 30,
  variationConversion: 0.2,
} as const;

/** Gravité selon le dépassement du seuil : ×1 → 1, ×2 → 2, … plafonnée à 5. */
const gravite = (valeur: number, seuil: number) =>
  Math.max(1, Math.min(5, Math.floor(valeur / seuil)));

export function detecterAlertes(
  semaine: Agregat,
  reference: Agregat,
  seuils: typeof SEUILS_DETECTION = SEUILS_DETECTION,
): AlerteDetectee[] {
  const n = semaine.sessions;
  if (n < seuils.sessionsMin) return [];
  const alertes: AlerteDetectee[] = [];
  const taux = (x: number) => x / n;
  for (const [id, e] of Object.entries(semaine.elements)) {
    const regles: [TypeAlerte, number, number][] = [
      ['clic_mort', taux(e.morts), seuils.clicsMorts],
      ['rage', taux(e.rages), seuils.rages],
      ['hesitation', taux(e.hesitations), seuils.hesitations],
    ];
    for (const [type, valeur, seuil] of regles)
      if (valeur > seuil)
        alertes.push({
          type,
          element: id,
          gravite: gravite(valeur, seuil),
          valeur,
          reference: seuil,
        });
  }
  const sections = Object.entries(semaine.sections).filter(([, s]) => s.vues > 0);
  const moyenne =
    sections.reduce((t, [, s]) => t + s.sorties / s.vues, 0) / Math.max(1, sections.length);
  for (const [id, s] of sections) {
    const valeur = s.sorties / s.vues;
    if (s.sorties >= seuils.sortiesMin && moyenne > 0 && valeur > moyenne * seuils.sortieRelative)
      alertes.push({
        type: 'sortie',
        element: id,
        gravite: gravite(valeur, moyenne * seuils.sortieRelative),
        valeur,
        reference: moyenne,
      });
  }
  if (reference.sessions >= seuils.sessionsMin) {
    const avant = reference.conversions / reference.sessions;
    const maintenant = semaine.conversions / n;
    if (avant > 0 && (avant - maintenant) / avant > seuils.variationConversion)
      alertes.push({
        type: 'baisse_conversion',
        gravite: gravite((avant - maintenant) / avant, seuils.variationConversion),
        valeur: maintenant,
        reference: avant,
      });
  }
  return alertes;
}

/** Clé de dédoublonnage : une alerte ouverte par page, type et élément. */
export const cleAlerte = (page: string, a: Pick<AlerteDetectee, 'type' | 'element'>) =>
  `${page}_${a.type}_${a.element ?? 'page'}`.replace(/[^a-z0-9_-]/gi, '-');
