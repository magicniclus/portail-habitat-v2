import type { Niveau, Point } from '../schemas/dessinScene';
import { couvertureEtage, sousToit } from './ailesToit';
import { pointDansPolygone } from './geometrie';
import { contourMur } from './murs';
import { contoursRaccordes } from './raccords';
import { devant } from './revetements';
import { ACROTERE, versLocal, type Emprise, type Point3 } from './toitures';

/**
 * Acrotères d'un toit plat (DES-16) : le haut des murs extérieurs prolongé de 40 cm, à leur
 * épaisseur et angles raccordés. Ils suivent la maison (L, U, O, biais…), jamais la limite
 * entre deux parties du toit ; rien sous l'étage ni autour d'un patio côté patio fermé.
 */
export function acroteres(n: Niveau, dessus: Niveau | null, ailes: readonly Emprise[]): Point3[][] {
  const plates = ailes.filter((e) => e.type === 'plate');
  if (!plates.length) return [];
  const contours = contoursRaccordes(n.murs);
  const haut = dessus ? couvertureEtage(dessus) : [];
  const couvertes = sousToit(n.pieces);
  const dehors = (p: Point) => !couvertes.some((x) => pointDansPolygone(p, x.contour));
  return n.murs
    .filter((m) => m.type === 'mur')
    .flatMap((m) => {
      if (!dehors(devant(m, 'a')) && !dehors(devant(m, 'b'))) return [];
      const milieu = { x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 };
      if (haut.some((poly) => pointDansPolygone(milieu, poly))) return [];
      const aile = plates.find((e) => {
        const l = versLocal(e, milieu);
        return Math.abs(l.a) <= e.L0 / 2 + m.epaisseur && Math.abs(l.b) <= e.P0 / 2 + m.epaisseur;
      });
      if (!aile) return [];
      const c = contours.get(m.id) ?? contourMur(m);
      const [bas, dessusMur] = [
        aile.base + (aile.surcroit ?? 0),
        aile.base + (aile.surcroit ?? 0) + ACROTERE,
      ];
      const faces: Point3[][] = c.map((p, i) => {
        const q = c[(i + 1) % c.length]!;
        return [
          { ...p, z: bas },
          { ...q, z: bas },
          { ...q, z: dessusMur },
          { ...p, z: dessusMur },
        ];
      });
      return [...faces, c.map((p) => ({ ...p, z: dessusMur }))];
    });
}
