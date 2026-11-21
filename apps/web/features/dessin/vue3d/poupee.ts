import type { Camera, Vector3 } from 'three';
import { M } from './unites';

/** Hauteur des murs abaissés en « maison de poupée » (mm). */
export const HAUTEUR_POUPEE = 900;

/**
 * Élément (x, y du plan en mm) entre la caméra et le centre de la maison : c'est un mur
 * « avant », à abaisser en maison de poupée (DES-33).
 */
export function devantLaCamera(camera: Camera, centre: Vector3, xMm: number, yMm: number): boolean {
  const vx = camera.position.x - centre.x;
  const vz = camera.position.z - centre.z;
  const l = Math.hypot(vx, vz) || 1;
  return ((M(xMm) - centre.x) * vx + (M(yMm) - centre.z) * vz) / l > 0.5;
}
