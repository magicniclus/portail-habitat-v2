import type { Mur, Niveau, Point, Revetement } from '../schemas/dessinScene';
import { longueurVolee, type Escalier } from './escaliers';
import { longueurMur } from './murs';
import { radians } from './geometrie';

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
  faceA: Revetement;
  faceB: Revetement;
}

export interface Dalle {
  pieceId: string;
  contour: Point[];
  /** Altitude du dessus (sol) ou du dessous (plafond). */
  z: number;
  revetement: Revetement;
}

/** Intervalles [début, fin] le long du mur occupés par les ouvertures, avec leur hauteur. */
type Trou = { de: number; a: number; bas: number; haut: number };

/**
 * Un mur découpé en pavés autour de ses portes et fenêtres : trumeaux pleine hauteur,
 * allège sous chaque baie et linteau au-dessus. Chaque extrémité déborde d'une demi-épaisseur
 * pour que les angles se referment.
 */
export function morceauxDeMur(
  m: Mur,
  n: Pick<Niveau, 'ouvertures' | 'altitude' | 'hauteurSousPlafond'>,
): MorceauMur[] {
  const L = longueurMur(m);
  if (L === 0 || m.type === 'separation') return [];
  const angle = Math.atan2(m.b.y - m.a.y, m.b.x - m.a.x);
  const u = { x: Math.cos(angle), y: Math.sin(angle) };
  const H = Math.max(m.hauteur, m.hauteurB ?? 0);
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
  const pave = (de: number, a: number, bas: number, haut: number): MorceauMur => {
    const milieu = (de + a) / 2;
    return {
      murId: m.id,
      faceA: m.faceA,
      faceB: m.faceB,
      angle,
      centre: { x: m.a.x + u.x * milieu, y: m.a.y + u.y * milieu, z: z0 + (bas + haut) / 2 },
      taille: { l: a - de, p: m.epaisseur, h: haut - bas },
    };
  };
  const morceaux: MorceauMur[] = [];
  let curseur = -deb;
  for (const t of trous) {
    if (t.de > curseur) morceaux.push(pave(curseur, t.de, 0, H));
    if (t.bas > 0) morceaux.push(pave(t.de, t.a, 0, t.bas));
    if (t.haut < H) morceaux.push(pave(t.de, t.a, t.haut, H));
    curseur = Math.max(curseur, t.a);
  }
  if (L + deb > curseur) morceaux.push(pave(curseur, L + deb, 0, H));
  return morceaux.filter((p) => p.taille.l > 0 && p.taille.h > 0);
}

/** Sols (dessus à l'altitude du niveau) et plafonds (sous la hauteur sous plafond). */
export function dallesDuNiveau(n: Niveau): { sols: Dalle[]; plafonds: Dalle[] } {
  return {
    sols: n.pieces.map((p) => ({
      pieceId: p.id,
      contour: p.contour,
      z: n.altitude,
      revetement: p.sol,
    })),
    plafonds: n.pieces.map((p) => ({
      pieceId: p.id,
      contour: p.contour,
      z: n.altitude + n.hauteurSousPlafond,
      revetement: p.plafond,
    })),
  };
}

/** Ligne de foulée de l'escalier, dans son repère (même repère que `empriseLocale`). */
function foulee(e: Escalier): Point[] {
  const l = e.largeur;
  const L = longueurVolee(e);
  if (e.type === 'helicoidal') {
    const c = Math.max(2 * l, 1400);
    const r = c / 2 - l / 2;
    return Array.from({ length: 25 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 24) * (Math.PI * 1.75);
      return { x: c / 2 + r * Math.cos(a), y: c / 2 + r * Math.sin(a) };
    });
  }
  if (e.type === 'quart_bas' || e.type === 'quart_haut') {
    const branche = Math.max(l, L - l);
    return [
      { x: l / 2, y: 0 },
      { x: l / 2, y: branche + l / 2 },
      { x: l + branche, y: branche + l / 2 },
    ];
  }
  if (e.type === 'deux_quarts') {
    const branche = Math.max(l, (L - l) / 2);
    return [
      { x: l / 2, y: 0 },
      { x: l / 2, y: branche + l / 2 },
      { x: (3 * l) / 2, y: branche + l / 2 },
      { x: (3 * l) / 2, y: 0 },
    ];
  }
  return [
    { x: l / 2, y: 0 },
    { x: l / 2, y: L + e.giron },
  ];
}

/**
 * Marches pleines (DES-33, DES-34) réparties sur la ligne de foulée : la marche i monte
 * jusqu'à (i + 1) × hauteur de marche. Placées sur le plan comme l'emprise.
 */
export function marchesEscalier(e: Escalier, altitude: number): Pave[] {
  const chemin = foulee(e);
  const longueurs = chemin
    .slice(1)
    .map((p, i) => Math.hypot(p.x - chemin[i]!.x, p.y - chemin[i]!.y));
  const total = longueurs.reduce((s, x) => s + x, 0);
  const pas = total / e.nbMarches;
  const hMarche = e.hauteurAMonter / e.nbMarches;
  const rot = radians(e.rotation);
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  const largeur = e.type === 'helicoidal' ? Math.max(2 * e.largeur, 1400) / 2 - 100 : e.largeur;
  return Array.from({ length: e.nbMarches }, (_, i) => {
    let d = (i + 0.5) * pas;
    let k = 0;
    while (k < longueurs.length - 1 && d > longueurs[k]!) d -= longueurs[k++]!;
    const [a, b] = [chemin[k]!, chemin[k + 1]!];
    const t = d / longueurs[k]!;
    const local = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const sens = Math.atan2(b.y - a.y, b.x - a.x);
    const h = (i + 1) * hMarche;
    return {
      centre: {
        x: e.position.x + local.x * c - local.y * s,
        y: e.position.y + local.x * s + local.y * c,
        z: altitude + h / 2,
      },
      // La marche est en travers de la foulée : l = largeur, p = giron.
      taille: { l: largeur, p: pas, h },
      angle: sens + rot - Math.PI / 2,
    };
  });
}
