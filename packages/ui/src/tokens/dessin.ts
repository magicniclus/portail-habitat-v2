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

/**
 * Matériaux de départ (D88 : catalogue maison à venir). `famille` suit `FAMILLES_REVETEMENT`
 * de @ph/core/dessin ; `format` en mm (carreau, lame) ; `joint` : couleur du joint ou du motif.
 */
export interface MateriauDessin {
  id: string;
  famille: string;
  libelle: string;
  couleur: string;
  joint?: string;
  format?: { l: number; p: number };
}

export const MATERIAUX_DESSIN: readonly MateriauDessin[] = [
  // Peintures
  { id: 'pe-blanc', famille: 'peinture', libelle: 'Blanc', couleur: '#fafaf8' },
  { id: 'pe-lin', famille: 'peinture', libelle: 'Lin', couleur: '#e9e0cf' },
  { id: 'pe-grege', famille: 'peinture', libelle: 'Grège', couleur: '#cfc5b6' },
  { id: 'pe-sauge', famille: 'peinture', libelle: 'Sauge', couleur: '#b7c4b1' },
  { id: 'pe-bleu', famille: 'peinture', libelle: 'Bleu ardoise', couleur: '#7d8fa3' },
  { id: 'pe-terracotta', famille: 'peinture', libelle: 'Terracotta', couleur: '#c8775a' },
  { id: 'pe-anthracite', famille: 'peinture', libelle: 'Anthracite', couleur: '#4a4f55' },
  // Papiers peints
  {
    id: 'pp-rayures',
    famille: 'papier_peint',
    libelle: 'Rayures douces',
    couleur: '#e6ddd0',
    joint: '#d2c5b2',
  },
  {
    id: 'pp-feuillage',
    famille: 'papier_peint',
    libelle: 'Feuillage',
    couleur: '#cdd8c6',
    joint: '#9fb194',
  },
  {
    id: 'pp-graphique',
    famille: 'papier_peint',
    libelle: 'Graphique',
    couleur: '#e3e6ea',
    joint: '#8a95a3',
  },
  // Carrelages et faïences
  {
    id: 'ca-blanc-60',
    famille: 'carrelage',
    libelle: 'Blanc 60 × 60',
    couleur: '#f1efea',
    joint: '#d6d2cb',
    format: { l: 600, p: 600 },
  },
  {
    id: 'ca-gris-60',
    famille: 'carrelage',
    libelle: 'Gris béton 60 × 60',
    couleur: '#b9b4ad',
    joint: '#9a958e',
    format: { l: 600, p: 600 },
  },
  {
    id: 'ca-ardoise-30',
    famille: 'carrelage',
    libelle: 'Ardoise 30 × 60',
    couleur: '#5f6670',
    joint: '#4a5058',
    format: { l: 600, p: 300 },
  },
  {
    id: 'ca-terre-cuite',
    famille: 'carrelage',
    libelle: 'Tomette terre cuite',
    couleur: '#b9684a',
    joint: '#e2d4c4',
    format: { l: 200, p: 200 },
  },
  {
    id: 'fa-metro',
    famille: 'faience',
    libelle: 'Métro blanc',
    couleur: '#f6f5f1',
    joint: '#cfcac2',
    format: { l: 150, p: 75 },
  },
  {
    id: 'fa-zellige',
    famille: 'faience',
    libelle: 'Zellige vert',
    couleur: '#5d8a78',
    joint: '#e8e4dc',
    format: { l: 100, p: 100 },
  },
  // Parquets et sols souples
  {
    id: 'pa-chene-clair',
    famille: 'parquet',
    libelle: 'Chêne clair',
    couleur: '#d9b98c',
    joint: '#c6a273',
    format: { l: 1200, p: 180 },
  },
  {
    id: 'pa-chene-naturel',
    famille: 'parquet',
    libelle: 'Chêne naturel',
    couleur: '#c39a66',
    joint: '#a8814f',
    format: { l: 1200, p: 180 },
  },
  {
    id: 'pa-noyer',
    famille: 'parquet',
    libelle: 'Noyer',
    couleur: '#7a5638',
    joint: '#5f4129',
    format: { l: 1200, p: 160 },
  },
  {
    id: 'st-gris',
    famille: 'stratifie',
    libelle: 'Stratifié gris',
    couleur: '#a9a39b',
    joint: '#918a81',
    format: { l: 1380, p: 190 },
  },
  {
    id: 'vi-beige',
    famille: 'vinyle',
    libelle: 'Vinyle beige',
    couleur: '#d8cbb6',
    joint: '#c4b59c',
    format: { l: 1220, p: 180 },
  },
  { id: 'mo-gris', famille: 'moquette', libelle: 'Moquette gris perle', couleur: '#c9c6c1' },
  { id: 'bc-gris', famille: 'beton_cire', libelle: 'Béton ciré gris', couleur: '#b4afa8' },
  {
    id: 'pi-travertin',
    famille: 'pierre',
    libelle: 'Travertin',
    couleur: '#e3d6bf',
    joint: '#cdbd9f',
    format: { l: 600, p: 400 },
  },
  // Parements et enduits
  {
    id: 'pr-brique',
    famille: 'parement',
    libelle: 'Brique',
    couleur: '#a8573f',
    joint: '#d9cdbd',
    format: { l: 220, p: 60 },
  },
  {
    id: 'pr-pierre',
    famille: 'parement',
    libelle: 'Pierre de parement',
    couleur: '#c9bba3',
    joint: '#a8987d',
    format: { l: 400, p: 150 },
  },
  { id: 'en-chaux', famille: 'enduit', libelle: 'Enduit à la chaux', couleur: '#ece4d6' },
  {
    id: 'ba-bois',
    famille: 'bardage',
    libelle: 'Bardage bois',
    couleur: '#9c7a55',
    joint: '#7d603f',
    format: { l: 3000, p: 150 },
  },
];

/** Couleurs des façades et des objets (nuancier de l'inspecteur). */
export const COULEURS_OBJETS: readonly TeinteDessin[] = [
  { id: 'blanc', libelle: 'Blanc', couleur: '#f7f6f2' },
  { id: 'chene', libelle: 'Chêne', couleur: '#c9a36f' },
  { id: 'sauge', libelle: 'Sauge', couleur: '#a9b8a1' },
  { id: 'bleu', libelle: 'Bleu nuit', couleur: '#344a63' },
  { id: 'terracotta', libelle: 'Terracotta', couleur: '#c8775a' },
  { id: 'anthracite', libelle: 'Anthracite', couleur: '#3e4247' },
];

/** Rendu 3D (lot 15g) : teintes des volumes de meubles, murs, terrain, ciel et lumières. */
export const COULEURS_3D = {
  principal: '#e8e2d8',
  clair: '#fbfaf7',
  sombre: '#4a4f55',
  verre: '#bcd3dc',
  metal: '#a8adb2',
  textile: '#b9b1a4',
  mur: '#f4f1ec',
  tranche: '#d9d4cc',
  sol: '#ece8e1',
  terrain: '#dfe6d6',
  ciel: '#eef2f5',
  soleil: '#fff4e0',
  selection: '#e05a10',
  /** Ambiance « soirée » de la vue photo : ciel, soleil couchant, lampes. */
  soiree: '#3b4357',
  couchant: '#ffb36b',
  lampe: '#ffd9a0',
  /** Menuiseries (lot 15h) : quincaillerie, seuil. */
  quincaillerie: '#b8bcc0',
  seuil: '#9a958e',
  /** Teinte neutre d'un matériau texturé (la texture porte la couleur). */
  blanc: '#ffffff',
} as const;

/** Couleurs de menuiserie (nuancier de l'inspecteur) ; la première est celle par défaut. */
export const COULEURS_MENUISERIE: readonly TeinteDessin[] = [
  { id: 'blanc', libelle: 'Blanc', couleur: '#f5f5f2' },
  { id: 'gris-7016', libelle: 'Gris anthracite', couleur: '#3b4045' },
  { id: 'noir', libelle: 'Noir', couleur: '#1f2124' },
  { id: 'chene-dore', libelle: 'Chêne doré', couleur: '#a8743f' },
  { id: 'bois-naturel', libelle: 'Bois naturel', couleur: '#c9a273' },
  { id: 'vert-sauge', libelle: 'Vert sauge', couleur: '#8f9f8a' },
];

/** Teinte par défaut d'une menuiserie selon son matériau. */
export const TEINTE_MENUISERIE = { pvc: '#f5f5f2', alu: '#3b4045', bois: '#c9a273' } as const;

/** Couvertures de toiture en 3D (lot 15h), par famille de revêtement. */
export const COULEURS_COUVERTURE = {
  tuile: '#b5583a',
  ardoise: '#4b5560',
  zinc: '#9aa3a8',
  bac_acier: '#6d7479',
  vegetalise: '#6f8f4e',
  facade: '#ece6dc',
  brique: '#9c4a35',
} as const;

/** Extérieur (lot 15h) : eau, margelles, végétaux, allées, clôtures, parcelle, gazon. */
export const COULEURS_EXTERIEUR = {
  eau: '#8cc7dd',
  eauFonce: '#3f8fb0',
  margelle: '#e6e0d4',
  vegetal: '#8fb47a',
  vegetalFonce: '#5f8a4e',
  tronc: '#7a5a3a',
  allee: '#d8d2c6',
  cloture: '#6b5a45',
  grillage: '#7f8c86',
  parcelle: '#a0703a',
  gazon: '#cfe0bf',
} as const;

/** Teinte par défaut d'une terrasse selon son matériau (sans référence de matériau). */
export const COULEURS_TERRASSE: Record<string, string> = {
  bois: '#a87b4f',
  composite: '#7d6b5d',
  dalle: '#cfc8bc',
  carrelage: '#e3ddd3',
  pierre: '#bdb5a6',
  beton_cire: '#b9b4ad',
};
