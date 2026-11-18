/**
 * Couleurs de Dessin (DESSIN.md §7, maquette docs/designs/Dessin.dc.html) : rendu du plan et
 * nuancier de départ des revêtements. Les matériaux complets arrivent au lot 15f (référentiel).
 */
export const COULEURS_PLAN = {
  mur: '#3f4a57',
  murSelection: '#e05a10',
  cote: '#57534f',
  coteTrait: '#8a857f',
  grille: '#cfcbc5',
  fond: '#f6f5f3',
  pieceVide: '#ffffff',
  etiquette: '#ffffff',
  etiquetteTrait: '#d9d6d1',
} as const;

export interface TeinteDessin {
  id: string;
  libelle: string;
  couleur: string;
}

/** Sols proposés dans l'inspecteur (famille → teinte). */
export const SOLS_DESSIN: readonly (TeinteDessin & {
  famille: 'parquet' | 'beton_cire' | 'carrelage' | 'stratifie';
})[] = [
  { id: 'chene', libelle: 'Parquet chêne clair', couleur: '#d9b98c', famille: 'parquet' },
  { id: 'beton', libelle: 'Béton ciré', couleur: '#b9b4ad', famille: 'beton_cire' },
  { id: 'carreau', libelle: 'Carrelage blanc', couleur: '#f1efea', famille: 'carrelage' },
  { id: 'ardoise', libelle: 'Carrelage ardoise', couleur: '#5f6670', famille: 'carrelage' },
];

/** Peintures proposées dans l'inspecteur. */
export const PEINTURES_DESSIN: readonly TeinteDessin[] = [
  { id: 'blanc', libelle: 'Blanc', couleur: '#fafaf8' },
  { id: 'lin', libelle: 'Lin', couleur: '#e9e0cf' },
  { id: 'sauge', libelle: 'Sauge', couleur: '#b7c4b1' },
  { id: 'terracotta', libelle: 'Terracotta', couleur: '#c8775a' },
];
