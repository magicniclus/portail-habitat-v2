import { succes, echec, type Resultat } from '../resultat';
import type { FamilleRevetement, Revetement, Scene } from '../schemas/dessinScene';

/**
 * Sol du terrain (DES-19) : la surface délimitée par la parcelle, en gazon par défaut ; on la
 * revêt de ce qu'on veut, comme le sol d'une pièce. Hors parcelle : sol neutre.
 */
export const FAMILLES_TERRAIN: readonly FamilleRevetement[] = [
  'gazon',
  'gravier',
  'dalle',
  'pierre',
  'carrelage',
  'bois',
  'beton_cire',
];

/** Revêtement du terrain, gazon s'il n'a jamais été choisi. */
export const REVETEMENT_TERRAIN: Revetement = { famille: 'gazon' };
export const revetementDuTerrain = (s: Pick<Scene, 'terrain'>): Revetement | null =>
  s.terrain ? (s.terrain.revetement ?? REVETEMENT_TERRAIN) : null;

/** Revêt le terrain délimité par la parcelle. */
export function revetirTerrain(s: Scene, r: Revetement): Resultat<Scene> {
  if (!s.terrain) return echec('PRECONDITION', { message: 'Placez d’abord la parcelle.' });
  return succes({ ...s, terrain: { ...s.terrain, revetement: r } });
}
