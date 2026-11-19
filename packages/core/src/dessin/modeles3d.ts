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
};

/** Adresse du modèle 3D d'un objet du catalogue, sinon `null` (forme simple). */
export const modele3D = (catalogueId: string): string | null =>
  MODELES[catalogueId] ? `/dessin/modeles/${MODELES[catalogueId]}.glb` : null;

/** Objets du catalogue qui ont un vrai modèle 3D. */
export const OBJETS_AVEC_MODELE: readonly string[] = Object.keys(MODELES);
