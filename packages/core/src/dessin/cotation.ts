import type { Niveau, Point } from '../schemas/dessinScene';
import { pointDansPolygone } from './geometrie';
import { longueurMur } from './murs';

/** Cote d'un mur, prête à dessiner (DES-10) ; tout en mm, angle du texte en degrés. */
export interface CoteMur {
  murId: string;
  longueur: number;
  /** Mur de façade (une pièce d'un seul côté) : coté dehors, avec lignes d'attache. */
  exterieure: boolean;
  /** Ligne de cote. */
  a: Point;
  b: Point;
  /** Pieds des lignes d'attache, sur la face du mur. */
  attacheA: Point;
  attacheB: Point;
  /** Texte : milieu de la ligne, orienté le long du mur, jamais à l'envers. */
  centre: Point;
  angle: number;
}

/**
 * Cotation des murs (DES-10), comme sur un plan d'architecte : les murs de façade sont cotés
 * à l'extérieur, à `ecart` mm de leur face, parallèlement au mur ; les murs intérieurs tout
 * contre leur face. La longueur est celle de l'axe (celle qu'on modifie en cliquant la cote).
 */
export function cotesMurs(n: Pick<Niveau, 'murs' | 'pieces'>, ecart: number): CoteMur[] {
  const dansUnePiece = (p: Point) => n.pieces.some((x) => pointDansPolygone(p, x.contour));
  return n.murs
    .filter((m) => m.type !== 'separation' && m.type !== 'poteau' && longueurMur(m) > 0)
    .map((m) => {
      const l = longueurMur(m);
      const u = { x: (m.b.x - m.a.x) / l, y: (m.b.y - m.a.y) / l };
      const nl = { x: -u.y, y: u.x };
      const milieu = { x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 };
      const sonde = (s: 1 | -1) =>
        dansUnePiece({
          x: milieu.x + nl.x * s * (m.epaisseur / 2 + 100),
          y: milieu.y + nl.y * s * (m.epaisseur / 2 + 100),
        });
      const [gauche, droite] = [sonde(1), sonde(-1)];
      const exterieure = gauche !== droite;
      // Côté de la cote : dehors pour une façade, à gauche pour un mur intérieur.
      const cote: 1 | -1 = exterieure && gauche ? -1 : 1;
      const face = m.epaisseur / 2;
      const decale = (p: Point, d: number) => ({
        x: p.x + nl.x * cote * d,
        y: p.y + nl.y * cote * d,
      });
      const d = face + (exterieure ? ecart : ecart / 4);
      const a = decale(m.a, d);
      const b = decale(m.b, d);
      let angle = (Math.atan2(u.y, u.x) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle <= -90) angle += 180;
      return {
        murId: m.id,
        longueur: Math.round(l),
        exterieure,
        a,
        b,
        attacheA: decale(m.a, face),
        attacheB: decale(m.b, face),
        centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        angle: Math.round(angle * 10) / 10,
      };
    });
}
