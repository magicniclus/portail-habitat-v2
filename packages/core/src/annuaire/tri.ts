import { normaliser } from '../recherche/texte';

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
  /** Formule Tout inclus : en tête des artisans à la une. */
  partenaire?: boolean;
  labels: readonly string[];
  /** Délai de disponibilité en jours. */
  delaiJ: number;
  /** Absent : la fiche est exclue dès qu'un budget est filtré. */
  budgetCle?: 'petit' | 'moyen' | 'grand';
  /** `scoreClassement` précalculé (MATCHING §4) ; absent : formule de la maquette. */
  score?: number;
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
  budget?: 'tous' | NonNullable<FicheAnnuaire['budgetCle']>;
}

/**
 * Pertinence (MATCHING §4) : `scoreClassement − 0,6 × km`. Sans score précalculé (démo, repli),
 * formule de la maquette : note × 12 + avis × 0,4 − km × 0,6.
 */
export const pertinence = (a: Pick<FicheAnnuaire, 'note' | 'avis' | 'km' | 'score'>) =>
  (a.score ?? a.note * 12 + a.avis * 0.4) - a.km * 0.6;

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
  // Chaque mot doit apparaître (accents et casse ignorés) : « douche italienne » (ANN-04).
  const mots = normaliser(f.q ?? '')
    .split(' ')
    .filter((m) => m.length > 1);
  const metiers = f.metiers ?? [];
  const labels = f.labels ?? [];
  return liste.filter((a) => {
    if (mots.length) {
      const texte = normaliser(`${a.nom} ${a.metiers.join(' ')} ${a.pitch} ${a.tags.join(' ')}`);
      if (!mots.every((m) => texte.includes(m))) return false;
    }
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
  return {
    premium: [
      ...r.filter((a) => a.premium && a.partenaire),
      ...r.filter((a) => a.premium && !a.partenaire),
    ],
    standards: r.filter((a) => !a.premium),
  };
}

/** Rang de mise en avant : partenaire (Tout inclus), puis premium, puis les autres. */
const rang = (a: FicheAnnuaire) => (a.partenaire ? 0 : a.premium ? 1 : 2);

/**
 * Aucun artisan dans le secteur : on montre quand même les plus proches, jamais une page vide.
 * Même métier d'abord (le texte recherché aussi), sinon tous métiers confondus ; partenaires,
 * puis premium, puis les autres, chacun du plus proche au plus loin.
 */
export function plusProches<T extends FicheAnnuaire>(
  liste: readonly T[],
  f: Pick<FiltresAnnuaire, 'metiers' | 'q'>,
  max = 12,
): T[] {
  const ordre = (l: readonly T[]) =>
    [...l].sort((a, b) => rang(a) - rang(b) || a.km - b.km).slice(0, max);
  const memeSujet = filtrerAnnuaire(liste, { ...f, rayonKm: Number.POSITIVE_INFINITY });
  return ordre(memeSujet.length ? memeSujet : liste);
}
