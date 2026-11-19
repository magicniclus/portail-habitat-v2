import type { FamilleRevetement } from '../schemas/dessinScene';

/**
 * Métré d'un niveau (DES-43) : quantités entières par poste, rattachées quand elle existe
 * à une prestation de docs/data/prestations-catalogue.json (les prix restent calculés
 * par le simulateur, côté serveur).
 */
export const POSTES_METRE = [
  'sol',
  'murs',
  'plafond',
  'plinthes',
  'cloisons',
  'portes_interieures',
  'porte_entree',
  'porte_garage',
  'fenetres',
  'terrasse',
  'piscine',
  'escalier',
  'plan_de_travail',
  'equipements',
  'couverture',
  'gouttieres',
  'fenetres_toit',
  'cheminees',
  'lucarnes',
  'combles',
  'clotures',
  'allees',
] as const;
export type PosteMetre = (typeof POSTES_METRE)[number];

export const LIBELLES_POSTE: Record<PosteMetre, string> = {
  sol: 'Revêtement de sol',
  murs: 'Revêtement des murs',
  plafond: 'Plafonds',
  plinthes: 'Plinthes',
  cloisons: 'Cloisons',
  portes_interieures: 'Portes intérieures',
  porte_entree: 'Porte d’entrée',
  porte_garage: 'Porte de garage',
  fenetres: 'Fenêtres et portes-fenêtres',
  terrasse: 'Terrasse',
  piscine: 'Piscine',
  escalier: 'Escalier',
  plan_de_travail: 'Plan de travail',
  equipements: 'Équipements',
  couverture: 'Couverture de toiture',
  gouttieres: 'Gouttières',
  fenetres_toit: 'Fenêtres de toit',
  cheminees: 'Cheminées',
  lucarnes: 'Lucarnes',
  combles: 'Combles (surface Carrez)',
  clotures: 'Clôtures',
  allees: 'Allées',
};

/** Libellé des équipements posés, par prestation du catalogue. */
export const LIBELLES_EQUIPEMENT: Record<string, string> = {
  'cuisine-pose': 'Meubles de cuisine',
  'sdb-douche': 'Douche',
  wc: 'WC',
  dressing: 'Dressing',
  'prises-eclairage': 'Prises, interrupteurs et points lumineux',
  'tableau-electrique': 'Tableau électrique',
  'chauffage-electrique': 'Radiateurs',
  chaudiere: 'Chaudière',
  'chauffe-eau': 'Ballon d’eau chaude',
  poele: 'Poêle',
  'abri-jardin': 'Abri de jardin',
};

/** mm² pour `m2`, mm pour `ml`, nombre pour `u`. */
export type UniteMetre = 'm2' | 'ml' | 'u';

export interface LigneMetre {
  poste: PosteMetre;
  famille?: FamilleRevetement;
  quantite: number;
  unite: UniteMetre;
  prestationId: string | null;
}

/** Prestation correspondant à un revêtement, `null` si le catalogue n'en a pas. */

/** Prestation du catalogue rattachée à chaque poste (prix calculés côté serveur). */
export const PRESTATION_SOL: Partial<Record<FamilleRevetement, string>> = {
  parquet: 'parquet',
  stratifie: 'sol-souple',
  vinyle: 'sol-souple',
  moquette: 'sol-souple',
  beton_cire: 'beton-cire-sol',
};
export const PRESTATION_MUR: Partial<Record<FamilleRevetement, string>> = {
  papier_peint: 'papier-peint',
  enduit: 'enduit-deco',
};
export const PRESTATION_FIXE: Partial<Record<PosteMetre, string>> = {
  cloisons: 'cloison',
  portes_interieures: 'portes-interieures',
  porte_entree: 'porte-entree',
  porte_garage: 'porte-garage',
  terrasse: 'terrasse',
  piscine: 'piscine',
  escalier: 'escalier',
  gouttieres: 'gouttieres',
  fenetres_toit: 'fenetre-toit',
  cheminees: 'cheminee',
  combles: 'combles-amenagement',
  clotures: 'cloture',
};

export { metreNiveau } from './metreNiveau';
