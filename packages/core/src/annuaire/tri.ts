/**
 * Filtres et tri de l'annuaire (README « Annuaire artisans »), portage de filtrer() et trier()
 * de la maquette Annuaire Artisans. En production le plein texte passe par Typesense (D4) ;
 * ce code sert au classement final et au repli sans moteur.
 */
export interface FicheAnnuaire {
  id: string;
  nom: string;
  metiers: readonly string[];
  pitch: string;
  tags: readonly string[];
  /** Distance au lieu recherché, en km. */
  km: number;
  note: number;
  avis: number;
  premium: boolean;
  labels: readonly string[];
  /** Délai de disponibilité en jours. */
  delaiJ: number;
  budgetCle: 'petit' | 'moyen' | 'grand';
}

export const TRIS = ['pertinence', 'note', 'proximite', 'delai', 'avis'] as const;
export type Tri = (typeof TRIS)[number];

export interface FiltresAnnuaire {
  q?: string;
  metiers?: readonly string[];
  rayonKm: number;
  noteMin?: number;
  /** Tous requis. */
  labels?: readonly string[];
  dispo?: 'tous' | 'semaine' | 'quinze';
  budget?: 'tous' | FicheAnnuaire['budgetCle'];
}

/** Score de pertinence : note × 12 + avis × 0,4 − km × 0,6. */
export const pertinence = (a: Pick<FicheAnnuaire, 'note' | 'avis' | 'km'>) =>
  a.note * 12 + a.avis * 0.4 - a.km * 0.6;

const COMPARATEURS: Record<Tri, (a: FicheAnnuaire, b: FicheAnnuaire) => number> = {
  note: (a, b) => b.note - a.note,
  proximite: (a, b) => a.km - b.km,
  delai: (a, b) => a.delaiJ - b.delaiJ,
  avis: (a, b) => b.avis - a.avis,
  pertinence: (a, b) => pertinence(b) - pertinence(a),
};

export function filtrerAnnuaire<T extends FicheAnnuaire>(
  liste: readonly T[],
  f: FiltresAnnuaire,
): T[] {
  const q = (f.q ?? '').trim().toLowerCase();
  const metiers = f.metiers ?? [];
  const labels = f.labels ?? [];
  return liste.filter((a) => {
    if (
      q &&
      !`${a.nom} ${a.metiers.join(' ')} ${a.pitch} ${a.tags.join(' ')}`.toLowerCase().includes(q)
    )
      return false;
    if (metiers.length && !a.metiers.some((m) => metiers.includes(m))) return false;
    if (a.km > f.rayonKm) return false;
    if (a.note < (f.noteMin ?? 0)) return false;
    if (labels.length && !labels.every((l) => a.labels.includes(l))) return false;
    if (f.dispo === 'semaine' && a.delaiJ > 7) return false;
    if (f.dispo === 'quinze' && a.delaiJ > 15) return false;
    if (f.budget && f.budget !== 'tous' && a.budgetCle !== f.budget) return false;
    return true;
  });
}

/** Tri stable : à égalité, l'ordre d'entrée est conservé. */
export function trierAnnuaire<T extends FicheAnnuaire>(liste: readonly T[], tri: Tri): T[] {
  return [...liste].sort(COMPARATEURS[tri]);
}

/**
 * Résultats de l'annuaire : Premium toujours en tête dans « Artisans à la une » (signalés, art. L111-7),
 * puis les autres selon le tri choisi. Aucune position n'est vendue dans la liste standard.
 */
export function resultatsAnnuaire<T extends FicheAnnuaire>(
  liste: readonly T[],
  f: FiltresAnnuaire,
  tri: Tri,
): { premium: T[]; standards: T[] } {
  const r = trierAnnuaire(filtrerAnnuaire(liste, f), tri);
  return { premium: r.filter((a) => a.premium), standards: r.filter((a) => !a.premium) };
}
