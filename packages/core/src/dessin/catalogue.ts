import { LIGNES_CUISINE } from './catalogueCuisine';
import { LIGNES_EXTERIEUR } from './catalogueExterieur';
import { LIGNES_MAISON } from './catalogueMaison';
import { LIGNES_TECHNIQUE } from './catalogueTechnique';

/**
 * Catalogue d'objets de Dessin (DES-21 à DES-24) : objets paramétrables posés sur le plan.
 * Dimensions en mm (largeur l, profondeur p, hauteur h). Le modèle 3D viendra au lot 15g ;
 * en 2D, chaque objet est dessiné par son `symbole`. Données d'origine Portail Travaux (D88).
 */
export const CATEGORIES_OBJETS = [
  'cuisine',
  'salle_de_bain',
  'chambre',
  'dressing',
  'enfant',
  'bureau',
  'sejour',
  'deco',
  'electricite',
  'chauffage',
  'exterieur',
] as const;
export type CategorieObjet = (typeof CATEGORIES_OBJETS)[number];

export const LIBELLES_CATEGORIE: Record<CategorieObjet, string> = {
  cuisine: 'Cuisine',
  salle_de_bain: 'Salle de bain',
  chambre: 'Chambre',
  dressing: 'Dressing',
  enfant: 'Chambre d’enfant',
  bureau: 'Bureau',
  sejour: 'Séjour et mobilier',
  deco: 'Luminaires et déco',
  electricite: 'Électricité',
  chauffage: 'Plomberie et chauffage',
  exterieur: 'Extérieur',
};

/** Forme dessinée en 2D (vue de dessus). */
export type SymboleObjet =
  | 'rectangle'
  | 'rond'
  | 'meuble_bas'
  | 'meuble_haut'
  | 'colonne'
  | 'evier'
  | 'plaque'
  | 'frigo'
  | 'lave_vaisselle'
  | 'hotte'
  | 'baignoire'
  | 'douche'
  | 'vasque'
  | 'wc'
  | 'lit'
  | 'canape'
  | 'table'
  | 'table_ronde'
  | 'chaise'
  | 'armoire'
  | 'tapis'
  | 'prise'
  | 'interrupteur'
  | 'point_lumineux'
  | 'radiateur'
  | 'plante'
  | 'ilot'
  | 'tabouret'
  | 'table_haute'
  | 'buffet'
  | 'etagere'
  | 'banc'
  | 'four'
  | 'pergola'
  | 'carport'
  | 'serre'
  | 'abri'
  | 'transat'
  | 'parasol'
  | 'jardiniere';

/** Rôle d'un meuble de cuisine : plan de travail, triangle d'activité (DES-23). */
export type ModuleCuisine = 'bas' | 'haut' | 'colonne' | 'evier' | 'plaque' | 'frigo';

export interface ObjetCatalogue {
  id: string;
  libelle: string;
  categorie: CategorieObjet;
  symbole: SymboleObjet;
  dimensions: { l: number; p: number; h: number };
  /** Plages réglables ; absentes = dimension fixe à ±50 %. */
  plages?: { l?: [number, number]; p?: [number, number]; h?: [number, number] };
  /** Posé contre un mur (dos au mur) quand on le place près d'un mur. */
  contreMur?: boolean;
  /** Hauteur de pose (meubles hauts, prises, luminaires), en mm. */
  altitude?: number;
  cuisine?: ModuleCuisine;
  /** Prestation du catalogue Portail Travaux pour le métré (docs/data/prestations-catalogue.json). */
  prestationId?: string;
}

export type Ligne = [
  id: string,
  libelle: string,
  symbole: SymboleObjet,
  l: number,
  p: number,
  h: number,
  options?: Partial<
    Pick<ObjetCatalogue, 'plages' | 'contreMur' | 'altitude' | 'cuisine' | 'prestationId'>
  >,
];

const PAR_CATEGORIE = {
  ...LIGNES_CUISINE,
  ...LIGNES_MAISON,
  ...LIGNES_TECHNIQUE,
  ...LIGNES_EXTERIEUR,
} as Record<CategorieObjet, Ligne[]>;

export const CATALOGUE_OBJETS: readonly ObjetCatalogue[] = Object.entries(PAR_CATEGORIE).flatMap(
  ([categorie, lignes]) =>
    lignes.map(([id, libelle, symbole, l, p, h, options]) => ({
      id,
      libelle,
      categorie: categorie as CategorieObjet,
      symbole,
      dimensions: { l, p, h },
      ...options,
    })),
);

const INDEX = new Map(CATALOGUE_OBJETS.map((o) => [o.id, o]));
export const objetDuCatalogue = (id: string): ObjetCatalogue | undefined => INDEX.get(id);

/** Plages effectives d'un objet (±50 % autour des dimensions par défaut si non précisées). */
export function plagesDe(o: ObjetCatalogue): Record<'l' | 'p' | 'h', [number, number]> {
  const auto = (v: number): [number, number] => [
    Math.max(1, Math.round(v / 2)),
    Math.round(v * 1.5) || 3_000,
  ];
  return {
    l: o.plages?.l ?? auto(o.dimensions.l),
    p: o.plages?.p ?? auto(o.dimensions.p),
    h: o.plages?.h ?? [0, Math.max(3_000, o.dimensions.h * 2)],
  };
}

/** Recherche plein texte, sans accents ni casse (DES-21). */
export function chercherObjets(texte: string): ObjetCatalogue[] {
  const net = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const mots = net(texte).split(/\s+/).filter(Boolean);
  if (mots.length === 0) return [];
  return CATALOGUE_OBJETS.filter((o) => {
    const t = net(`${o.libelle} ${LIBELLES_CATEGORIE[o.categorie]}`);
    return mots.every((m) => t.includes(m));
  });
}
