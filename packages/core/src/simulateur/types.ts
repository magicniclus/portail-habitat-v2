/** Fourchette [min, max] en centimes (ou coefficient multiplicateur selon le contexte). */
export type Paire = readonly [number, number];

export type Reponse = number | string | string[];
export type Reponses = Readonly<Record<string, Reponse | undefined>>;

/** Poste de l'estimation, en centimes (flottants tant que le calcul n'est pas terminé). */
export interface Poste {
  label: string;
  min: number;
  max: number;
}

export type Acces = 'facile' | 'etage' | 'difficile';

export interface Coefficients {
  regions: { departements: string[]; coef: number; note: string }[];
  autreDepartement: { coef: number; note: string };
  sansCodePostal: { coef: number; note: string };
  acces: Record<Acces, number>;
}

/** Tarif déclaratif d'une prestation du catalogue générique (centimes). */
export interface TarifGenerique {
  lib: string;
  /** Prix unitaire par unité de quantité. */
  unitaire: Paire;
  base: Paire;
  evac: Paire;
  /** [id du champ, libellé, aide, options [valeur, libellé, description, coefficient]]. */
  choix: [string, string, string, [string, string, string, number][]][];
  /** [valeur, libellé, min, max, parUnite?] : par unité de quantité si la 5e valeur est présente. */
  extras: ([string, string, number, number] | [string, string, number, number, boolean])[];
}

/** Accumule les postes dans l'ordre ; un poste dont le maximum est nul est ignoré (comme la maquette). */
export class Postes {
  readonly liste: Poste[] = [];
  ajouter(label: string, min: number, max: number): void {
    if (max > 0) this.liste.push({ label, min, max });
  }
  /** Ajoute une fourchette multipliée par une quantité et des coefficients. */
  fourchette(label: string, [min, max]: Paire, ...facteurs: number[]): void {
    const f = facteurs.reduce((a, b) => a * b, 1);
    this.ajouter(label, min * f, max * f);
  }
  multiplier(coefMin: number, coefMax = coefMin): void {
    for (const p of this.liste) {
      p.min *= coefMin;
      p.max *= coefMax;
    }
  }
}

export const nombre = (v: Reponse | undefined): number =>
  typeof v === 'number' ? v : Number(v) || 0;
export const texte = (v: Reponse | undefined): string => (typeof v === 'string' ? v : '');
export const coche = (v: Reponse | undefined, valeur: string): boolean =>
  Array.isArray(v) && v.includes(valeur);

/** Valeur d'une table de coefficients ; une clé inconnue est une erreur de saisie, pas un prix à zéro. */
export function lire<T>(table: Readonly<Record<string, T>>, cle: string, champ: string): T {
  const v = table[cle];
  if (v === undefined) throw new RangeError(`Valeur « ${cle} » inconnue pour « ${champ} »`);
  return v;
}
