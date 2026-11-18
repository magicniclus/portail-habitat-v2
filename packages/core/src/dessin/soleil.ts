import { radians } from './geometrie';
/**
 * Direction du soleil (DES-33, ombres selon l'heure et l'orientation) : modèle simple
 * pour la France (soleil au sud à midi, levé à 6 h, couché à 20 h, 60° au plus haut).
 * Renvoie un vecteur unitaire vers le soleil, dans le repère du plan (x, y au sol, z en haut).
 * `orientationNord` : angle (dixièmes de degré) du nord par rapport au haut du plan, horaire.
 */
export function directionSoleil(
  heure: number,
  orientationNord: number,
): { x: number; y: number; z: number } {
  const h = Math.min(20, Math.max(6, heure));
  // Azimut depuis le nord vers l'est : 90° à 6 h (est), 180° à midi (sud), 270° à 18 h.
  const azimut = ((180 + (h - 12) * 15) * Math.PI) / 180;
  const hauteur = Math.max(5, 60 * Math.sin((Math.PI * (h - 6)) / 14)) * (Math.PI / 180);
  const n = radians(orientationNord);
  // Nord : (0, -1) tourné de n dans le sens horaire (y vers le bas) ; est : nord + 90°.
  const nord = { x: Math.sin(n), y: -Math.cos(n) };
  const est = { x: -nord.y, y: nord.x };
  const sol = Math.cos(hauteur);
  return {
    x: (nord.x * Math.cos(azimut) + est.x * Math.sin(azimut)) * sol,
    y: (nord.y * Math.cos(azimut) + est.y * Math.sin(azimut)) * sol,
    z: Math.sin(hauteur),
  };
}
