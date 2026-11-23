import type { Mur, Niveau, Point, Revetement } from '../schemas/dessinScene';
import { longueurMur } from './murs';
import {
  aireSignee,
  decalerVersInterieur,
  distancePointSegment,
  pointDansPolygone,
} from './geometrie';
import { emprise } from './escaliers';

/**
 * Géométrie 3D tirée de la scène (DES-33), sans dépendance au moteur de rendu : pavés et
 * dalles en millimètres. Repère du plan : x, y au sol, z vers le haut depuis le niveau 0.
 */

/** Pavé : centre, dimensions (l le long de `angle`, p en travers, h en hauteur). */
export interface Pave {
  centre: { x: number; y: number; z: number };
  taille: { l: number; p: number; h: number };
  /** Angle au sol en radians (de l'axe x vers l'axe y du plan). */
  angle: number;
}

export interface MorceauMur extends Pave {
  murId: string;
  /**
   * Emprise au sol exacte [gauche début, gauche fin, droite fin, droite début] : aux extrémités
   * du mur, les angles taillés en onglet ou arrêtés sur un mur en T (aucun recouvrement).
   */
  empreinte: Point[];
  faceA: Revetement;
  faceB: Revetement;
  /**
   * Côtés de début et de fin réellement à l'air (bout du mur, tableau d'une baie). Un côté
   * collé au morceau voisin n'est pas dessiné : il marquerait la façade d'un trait d'ombre.
   */
  visibles?: { debut: boolean; fin: boolean };
  /**
   * Milieu du mur entier (axe) : tous les morceaux d'un mur, et ses menuiseries, décident
   * ensemble s'ils sont « devant » la caméra (maison de poupée), jamais morceau par morceau.
   */
  milieuMur?: Point;
}

export interface Dalle {
  pieceId: string;
  /** Zone décorative au sol (DES-27) posée sur la pièce, un centimètre au-dessus. */
  zoneId?: string;
  contour: Point[];
  /** Altitude du dessus (sol) ou du dessous (plafond). */
  z: number;
  revetement: Revetement;
  /** Trémies d'escalier percées dans ce sol ou ce plafond (dans le contour). */
  trous?: Point[][];
}

/** Partie d'un polygone dans un polygone convexe (Sutherland–Hodgman) : trémie dans la pièce. */
export function decouperConvexe(sujet: readonly Point[], convexe: readonly Point[]): Point[] {
  const sens = aireSignee(convexe) > 0 ? 1 : -1;
  const dedans = (p: Point, a: Point, b: Point) =>
    sens * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) >= 0;
  let sortie = [...sujet];
  convexe.forEach((a, i) => {
    const b = convexe[(i + 1) % convexe.length]!;
    const entree = sortie;
    sortie = [];
    entree.forEach((p, k) => {
      const q = entree[(k + 1) % entree.length]!;
      const [pIn, qIn] = [dedans(p, a, b), dedans(q, a, b)];
      if (pIn) sortie.push(p);
      if (pIn !== qIn) {
        const i2 = intersectionDroites(p, q, a, b);
        if (i2) sortie.push(i2);
      }
    });
  });
  return sortie;
}

function intersectionDroites(p: Point, q: Point, a: Point, b: Point): Point | null {
  const d = (q.x - p.x) * (b.y - a.y) - (q.y - p.y) * (b.x - a.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x)) / d;
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/** Polygone convexe (tous les virages dans le même sens). */
const estConvexe = (p: readonly Point[]) => {
  const signes = p.map((a, i) => {
    const [b, c] = [p[(i + 1) % p.length]!, p[(i + 2) % p.length]!];
    return Math.sign((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x));
  });
  return signes.every((s) => s >= 0) || signes.every((s) => s <= 0);
};

/**
 * Trémies (emprises d'escalier) dans le contour : telles quelles si elles y tiennent (escalier
 * droit, en L, en U…), sinon découpées au contour (forme convexe) ; trous valides pour la 3D.
 */
const trousDans = (contour: readonly Point[], tremies: readonly Point[][]) =>
  tremies
    // Rentrée de 2 mm : un escalier contre un mur touche le contour, le trou reste dedans.
    .map((t) =>
      decalerVersInterieur(
        t,
        t.map(() => 2),
      ),
    )
    .map((t) =>
      t.every((q) => pointDansPolygone(q, contour))
        ? t
        : estConvexe(t)
          ? decouperConvexe(contour, t)
          : [],
    )
    .filter((t) => t.length >= 3 && Math.abs(aireSignee(t)) > 10_000);

/** Intervalles [début, fin] le long du mur occupés par les ouvertures, avec leur hauteur. */
type Trou = { de: number; a: number; bas: number; haut: number };

/**
 * Un mur découpé en pavés autour de ses portes et fenêtres, sur une grille commune (arêtes des
 * baies prolongées) : deux pavés voisins partagent toujours une arête entière, jamais un sommet
 * posé au milieu d'une arête (« jonction en T »), qui laisserait une fissure claire ou sombre au
 * rendu autour des menuiseries. Chaque extrémité déborde d'une demi-épaisseur
 * pour que les angles se referment. `rehausse` : un niveau au-dessus, les murs qui montent
 * jusqu'au plafond traversent l'épaisseur du plancher (façade continue, sans ressaut).
 */
export function morceauxDeMur(
  m: Mur,
  n: Pick<Niveau, 'ouvertures' | 'altitude' | 'hauteurSousPlafond'>,
  /** Contour raccordé du mur (`contoursRaccordes`) ; sinon rectangle débordant aux bouts. */
  contour?: readonly Point[],
  rehausse = 0,
): MorceauMur[] {
  const L = longueurMur(m);
  if (L === 0 || m.type === 'separation') return [];
  const angle = Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x);
  const u = { x: Math.cos(angle), y: Math.sin(angle) };
  const hMur = Math.max(m.hauteur, m.hauteurB ?? 0);
  const H =
    m.type !== 'poutre' && hMur >= n.hauteurSousPlafond ? hMur + Math.max(0, rehausse) : hMur;
  const deb = m.type === 'poteau' ? 0 : m.epaisseur / 2;
  const trous: Trou[] = n.ouvertures
    .filter((o) => o.murId === m.id)
    .map((o) => ({
      de: Math.max(0, o.position),
      a: Math.min(L, o.position + o.largeur),
      bas: o.allege,
      haut: Math.min(H, o.allege + o.hauteur),
    }))
    .sort((x, y) => x.de - y.de);
  // Une poutre est suspendue sous le plafond : sa « hauteur » est sa retombée.
  const z0 = n.altitude + (m.type === 'poutre' ? n.hauteurSousPlafond - m.hauteur : 0);
  // Lignes des deux faces (même décalage que `contourMur`).
  const [gauche, droite] =
    m.alignement === 'gauche'
      ? [m.epaisseur, 0]
      : m.alignement === 'droite'
        ? [0, m.epaisseur]
        : [m.epaisseur / 2, m.epaisseur / 2];
  const sur = (s: number, d: number) => ({
    x: m.a.x + u.x * s - u.y * d,
    y: m.a.y + u.y * s + u.x * d,
  });
  const empreinte = (de: number, a: number): Point[] => {
    const debut =
      contour && de <= -deb ? [contour[0]!, contour[3]!] : [sur(de, gauche), sur(de, -droite)];
    const fin =
      contour && a >= L + deb ? [contour[1]!, contour[2]!] : [sur(a, gauche), sur(a, -droite)];
    return [debut[0]!, fin[0]!, fin[1]!, debut[1]!];
  };
  const pave = (
    de: number,
    a: number,
    bas: number,
    haut: number,
    visibles = { debut: true, fin: true },
  ): MorceauMur => {
    const milieu = (de + a) / 2;
    return {
      visibles,
      milieuMur: { x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 },
      murId: m.id,
      empreinte: empreinte(de, a),
      faceA: m.faceA,
      faceB: m.faceB,
      angle,
      centre: { x: m.a.x + u.x * milieu, y: m.a.y + u.y * milieu, z: z0 + (bas + haut) / 2 },
      taille: { l: a - de, p: m.epaisseur, h: haut - bas },
    };
  };
  const uniques = (v: number[]) => [...new Set(v)].sort((x, y) => x - y);
  const ss = uniques([-deb, L + deb, ...trous.flatMap((t) => [t.de, t.a])]).filter(
    (s) => s >= -deb && s <= L + deb,
  );
  const zs = uniques([0, H, ...trous.flatMap((t) => [t.bas, t.haut])]).filter(
    (z) => z >= 0 && z <= H,
  );
  const vide = (s0: number, s1: number, z0: number, z1: number) =>
    trous.some((t) => t.de <= s0 && s1 <= t.a && t.bas <= z0 && z1 <= t.haut);
  const morceaux: MorceauMur[] = [];
  for (let i = 0; i + 1 < ss.length; i++)
    for (let j = 0; j + 1 < zs.length; j++) {
      const [s0, s1, b, h] = [ss[i]!, ss[i + 1]!, zs[j]!, zs[j + 1]!];
      if (vide(s0, s1, b, h)) continue;
      // Côté visible : au bout du mur, ou contre une baie ; sinon collé au pavé voisin.
      const visibles = {
        debut: i === 0 || vide(ss[i - 1]!, s0, b, h),
        fin: i + 2 === ss.length || vide(s1, ss[i + 2]!, b, h),
      };
      morceaux.push(pave(s0, s1, b, h, visibles));
    }
  return morceaux.filter((p) => p.taille.l > 0 && p.taille.h > 0);
}

/** Sols (dessus à l'altitude du niveau) et plafonds (sous la hauteur sous plafond). */
/**
 * Sol d'une pièce prolongé sous ses murs jusqu'à leur axe : sous une porte, les sols des deux
 * pièces se rejoignent au milieu du passage (jamais de trou où l'on verrait le terrain).
 */
export function solSousLesMurs(n: Pick<Niveau, 'murs'>, contour: readonly Point[]): Point[] {
  const distances = contour.map((p, i) => {
    const q = contour[(i + 1) % contour.length]!;
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const mur = n.murs.find(
      (w) => w.type !== 'separation' && distancePointSegment(m, w.a, w.b) <= w.epaisseur / 2 + 20,
    );
    return mur ? -distancePointSegment(m, mur.a, mur.b) : 0;
  });
  return decalerVersInterieur(contour, distances).map((p) => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
  }));
}

export function dallesDuNiveau(
  n: Niveau,
  /** Trémies du sol de ce niveau (escaliers du niveau du dessous). */
  tremiesSol: readonly Point[][] = [],
): { sols: Dalle[]; plafonds: Dalle[] } {
  // Plafond percé au-dessus des escaliers qui montent de ce niveau.
  const tremiesPlafond = n.escaliers.map(emprise);
  return {
    sols: [
      ...n.pieces.map((p) => ({
        pieceId: p.id,
        contour: solSousLesMurs(n, p.contour),
        trous: trousDans(solSousLesMurs(n, p.contour), tremiesSol),
        z: n.altitude,
        revetement: p.sol,
      })),
      // Zones au sol : un tapis de revêtement 1 cm au-dessus du sol (aucun scintillement).
      ...n.zonesDeco.flatMap((z) =>
        z.support.genre === 'piece' && z.support.surface === 'sol'
          ? [
              {
                pieceId: z.support.pieceId,
                zoneId: z.id,
                contour: z.contour,
                z: n.altitude + 10,
                revetement: z.revetement,
              },
            ]
          : [],
      ),
    ],
    plafonds: n.pieces.map((p) => ({
      pieceId: p.id,
      contour: p.contour,
      z: n.altitude + n.hauteurSousPlafond,
      revetement: p.plafond,
      trous: trousDans(p.contour, tremiesPlafond),
    })),
  };
}
