import type { Mur, Point } from '../schemas/dessinScene';
import {
  aire,
  aireSignee,
  arrondir,
  decalerVersInterieur,
  distance,
  intersectionSegments,
  perimetre,
} from './geometrie';
import { TYPES_FERMANTS } from './murs';

export interface PieceDetectee {
  /** Contour sur l'axe des murs. */
  contourAxes: Point[];
  /** Contour intérieur (axes décalés de la demi-épaisseur des murs), arrondi au mm. */
  contour: Point[];
  /** mm², entier. */
  surface: number;
  /** mm, entier. */
  perimetre: number;
}

const cle = (p: Point) => `${p.x},${p.y}`;
const cleArete = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

interface Arete {
  de: string;
  vers: string;
  epaisseur: number;
}
interface Graphe {
  sommets: Map<string, Point>;
  aretes: Map<string, Arete>;
}

/** Graphe planaire des axes des murs fermants, découpés à chaque croisement. */
function graphe(fermants: readonly Mur[]): Graphe {
  const sommets = new Map<string, Point>();
  const aretes = new Map<string, Arete>();
  for (const m of fermants) {
    const coupes: { t: number; p: Point }[] = [
      { t: 0, p: m.a },
      { t: 1, p: m.b },
    ];
    const l = distance(m.a, m.b);
    for (const autre of fermants) {
      if (autre === m) continue;
      const x = intersectionSegments(m.a, m.b, autre.a, autre.b);
      if (x) coupes.push({ t: distance(m.a, x) / l, p: x });
    }
    coupes.sort((u, v) => u.t - v.t);
    const points = coupes.map((c) => arrondir(c.p));
    for (let i = 0; i < points.length - 1; i++) {
      const [p, q] = [points[i]!, points[i + 1]!];
      const [kp, kq] = [cle(p), cle(q)];
      if (kp === kq) continue;
      sommets.set(kp, p);
      sommets.set(kq, q);
      const k = cleArete(kp, kq);
      if (!aretes.has(k)) aretes.set(k, { de: kp, vers: kq, epaisseur: m.epaisseur });
    }
  }
  return { sommets, aretes };
}

/** Voisins de chaque sommet, sans les murs isolés (cul-de-sac), retirés jusqu'à stabilité. */
function voisinsUtiles(aretes: Graphe['aretes']): Map<string, Set<string>> {
  const voisins = new Map<string, Set<string>>();
  const lier = (a: string, b: string) => {
    if (!voisins.has(a)) voisins.set(a, new Set());
    voisins.get(a)!.add(b);
  };
  for (const a of aretes.values()) {
    lier(a.de, a.vers);
    lier(a.vers, a.de);
  }
  let retire = true;
  while (retire) {
    retire = false;
    for (const [s, vs] of voisins) {
      if (vs.size < 2) {
        for (const v of vs) voisins.get(v)?.delete(s);
        voisins.delete(s);
        retire = true;
      }
    }
  }
  return voisins;
}

/** Faces minimales : à chaque sommet, on tourne vers l'arête juste avant celle d'arrivée. */
function faces(sommets: Graphe['sommets'], voisins: Map<string, Set<string>>): string[][] {
  const angleDe = (a: string, b: string) => {
    const [p, q] = [sommets.get(a)!, sommets.get(b)!];
    return Math.atan2(q.y - p.y, q.x - p.x);
  };
  const tries = new Map<string, string[]>();
  for (const [s, vs] of voisins)
    tries.set(
      s,
      [...vs].sort((u, v) => angleDe(s, u) - angleDe(s, v)),
    );
  const visitees = new Set<string>();
  const resultat: string[][] = [];
  for (const [s, vs] of tries) {
    for (const v of vs) {
      if (visitees.has(`${s}>${v}`)) continue;
      const face: string[] = [];
      let [de, vers] = [s, v];
      while (!visitees.has(`${de}>${vers}`)) {
        visitees.add(`${de}>${vers}`);
        face.push(de);
        const autour = tries.get(vers)!;
        const i = autour.indexOf(de);
        [de, vers] = [vers, autour[(i - 1 + autour.length) % autour.length]!];
      }
      resultat.push(face);
    }
  }
  return resultat;
}

/**
 * Détection automatique des pièces fermées (DES-11) : graphe planaire des axes des murs
 * fermants, découpés à chaque croisement, puis parcours des faces minimales.
 */
export function detecterPieces(murs: readonly Mur[]): PieceDetectee[] {
  const { sommets, aretes } = graphe(murs.filter((m) => TYPES_FERMANTS.includes(m.type)));
  const epaisseurEntre = (a: string, b: string) => aretes.get(cleArete(a, b))!.epaisseur;
  return faces(sommets, voisinsUtiles(aretes))
    .map((f) => f.map((k) => sommets.get(k)!))
    .filter((poly) => poly.length >= 3 && aireSignee(poly) > 0)
    .map((contourAxes) => {
      const n = contourAxes.length;
      const distances = contourAxes.map(
        (_, i) => epaisseurEntre(cle(contourAxes[i]!), cle(contourAxes[(i + 1) % n]!)) / 2,
      );
      const contour = decalerVersInterieur(contourAxes, distances).map(arrondir);
      return {
        contourAxes,
        contour,
        surface: Math.round(aire(contour)),
        perimetre: Math.round(perimetre(contour)),
      };
    })
    .filter((p) => p.surface > 0);
}
