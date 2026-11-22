/**
 * Vrais modèles 3D des meubles (D88) : fichiers `glb` libres (CC0, Poly Haven), compressés
 * (meshopt, textures WebP) et servis par l'application. Licences : docs/data/dessin-licences.json.
 * Un objet sans modèle garde sa forme simple (formes3d.ts).
 */
const MODELES: Readonly<Record<string, string>> = {
  'canape-3': 'sofa_02',
  fauteuil: 'modern_arm_chair_01',
  'table-basse': 'modern_coffee_table_01',
  'table-6': 'dining_table',
  'table-ronde': 'round_wooden_table_02',
  chaise: 'dining_chair_02',
  buffet: 'modern_wooden_cabinet',
  chevet: 'side_table_01',
  commode: 'painted_wooden_cabinet',
  armoire: 'painted_wooden_cabinet_02',
  bibliotheque: 'wooden_display_shelves_01',
  bureau: 'metal_office_desk',
  'lit-90': 'old_bed_frame',
  suspension: 'modern_ceiling_lamp_01',
  plante: 'potted_plant_02',
  miroir: 'ornate_mirror_01',
  'salon-jardin': 'outdoor_table_chair_set_01',
  'fauteuil-lounge': 'mid_century_lounge_chair',
  'table-basse-ronde': 'coffee_table_round_01',
  pouf: 'Ottoman_01',
  'tabouret-bar': 'metal_stool_03',
  tabouret: 'metal_stool_02',
  cuisiniere: 'electric_stove',
  'etagere-bureau': 'drawer_cabinet',
  'etagere-sejour': 'steel_frame_shelves_03',
  'table-4': 'wooden_table_02',
  'bureau-enfant': 'small_wooden_table_01',
  'plante-pot': 'potted_plant_01',
  succulente: 'potted_plant_04',
  ventilateur: 'ceiling_fan',
  jardiniere: 'planter_box_01',
  'potager-sureleve': 'planter_box_03',
  'table-pique-nique': 'wooden_picnic_table',
  'chaise-jardin': 'plastic_monobloc_chair_01',
  foyer: 'stone_fire_pit',
};

/** Adresse du modèle 3D d'un objet du catalogue, sinon `null` (forme simple). */
export const modele3D = (catalogueId: string): string | null =>
  MODELES[catalogueId] ? `/dessin/modeles/${MODELES[catalogueId]}.glb` : null;

/** Objets du catalogue qui ont un vrai modèle 3D. */
export const OBJETS_AVEC_MODELE: readonly string[] = Object.keys(MODELES);

/**
 * Textures photo des revêtements (D88, CC0 Poly Haven) : couleur, relief et rugosité, en WebP.
 * `taille` : côté réel couvert par une image, en mm (la texture se répète à cette échelle).
 */
const TEXTURES: Readonly<Record<string, { fichier: string; taille: number }>> = {
  'pa-chene-clair': { fichier: 'laminate_floor_02', taille: 1700 },
  'pa-chene-naturel': { fichier: 'wood_floor', taille: 1700 },
  'pa-noyer': { fichier: 'dark_wooden_planks', taille: 2000 },
  'ca-gris-60': { fichier: 'concrete_tiles_02', taille: 1825 },
  'ca-terre-cuite': { fichier: 'terracotta_floor_tiles', taille: 2080 },
  'fa-metro': { fichier: 'long_white_tiles', taille: 1270 },
  'bc-gris': { fichier: 'plastered_wall_04', taille: 3200 },
  'pi-travertin': { fichier: 'marble_01', taille: 1500 },
  'pr-brique': { fichier: 'red_brick', taille: 1400 },
  'pr-pierre': { fichier: 'stacked_stone_wall', taille: 2000 },
  'en-chaux': { fichier: 'white_stucco', taille: 1998 },
  // Couvertures de toit (DES-16) : rangs parallèles à l'égout, dans le sens de la pente.
  'toit-tuile': { fichier: 'clay_roof_tiles_02', taille: 2500 },
  'toit-ardoise': { fichier: 'roof_slates_03', taille: 3000 },
  'toit-bac-acier': { fichier: 'box_profile_metal_sheet', taille: 2000 },
};

/** Texture photo de chaque couverture de toit ; zinc et toit végétalisé restent unis. */
export const TEXTURE_COUVERTURE: Readonly<Record<string, string>> = {
  tuile: 'toit-tuile',
  ardoise: 'toit-ardoise',
  bac_acier: 'toit-bac-acier',
};

export interface TexturePhoto {
  couleur: string;
  relief: string;
  rugosite: string;
  taille: number;
}

/** Textures photo d'un matériau du catalogue, sinon `null` (motif dessiné). */
export function texturePhoto(materiauId: string | undefined): TexturePhoto | null {
  const t = materiauId ? TEXTURES[materiauId] : undefined;
  if (!t) return null;
  const url = (carte: string) => `/dessin/textures/${t.fichier}-${carte}.webp`;
  return {
    couleur: url('couleur'),
    relief: url('relief'),
    rugosite: url('rugosite'),
    taille: t.taille,
  };
}

/** Matériaux qui ont une texture photo. */
export const MATERIAUX_AVEC_TEXTURE: readonly string[] = Object.keys(TEXTURES);

/** Miniature 3D d'un objet du catalogue, vue de trois quarts (menu Équiper ; pnpm dessin:miniatures). */
export const miniatureObjet = (catalogueId: string) => `/dessin/miniatures/${catalogueId}.webp`;
