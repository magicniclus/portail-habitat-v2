import type { Camera, Vector3 } from 'three';

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
  return ((xMm / 1000 - centre.x) * vx + (yMm / 1000 - centre.z) * vz) / l > 0.5;
}
