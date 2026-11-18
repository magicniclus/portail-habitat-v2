import { echec, succes, type Resultat } from '../resultat';
import type { Mur, Niveau, Piece, Point } from '../schemas/dessinScene';
import {
  aire,
  aireSignee,
  arrondir,
  centroide,
  decalerVersInterieur,
  distance,
  intersectionSegments,
  perimetre,
  pointDansPolygone,
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

interface Arete {
  de: string;
  vers: string;
  epaisseur: number;
}

/**
 * Détection automatique des pièces fermées (DES-11) : graphe planaire des axes des murs
 * fermants, découpés à chaque croisement, puis parcours des faces minimales.
 */
export function detecterPieces(murs: readonly Mur[]): PieceDetectee[] {
  const fermants = murs.filter((m) => TYPES_FERMANTS.includes(m.type));
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
      const p = points[i]!;
      const q = points[i + 1]!;
      const kp = cle(p);
      const kq = cle(q);
      if (kp === kq) continue;
      sommets.set(kp, p);
      sommets.set(kq, q);
      const k = kp < kq ? `${kp}|${kq}` : `${kq}|${kp}`;
      if (!aretes.has(k)) aretes.set(k, { de: kp, vers: kq, epaisseur: m.epaisseur });
    }
  }

  // Les murs isolés (cul-de-sac) ne ferment rien : on les retire jusqu'à stabilité.
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

  const epaisseurEntre = (a: string, b: string) =>
    aretes.get(a < b ? `${a}|${b}` : `${b}|${a}`)!.epaisseur;
  const angleDe = (a: string, b: string) => {
    const p = sommets.get(a)!;
    const q = sommets.get(b)!;
    return Math.atan2(q.y - p.y, q.x - p.x);
  };
  const tries = new Map<string, string[]>();
  for (const [s, vs] of voisins)
    tries.set(
      s,
      [...vs].sort((u, v) => angleDe(s, u) - angleDe(s, v)),
    );

  const visitees = new Set<string>();
  const faces: string[][] = [];
  for (const [s, vs] of tries) {
    for (const v of vs) {
      if (visitees.has(`${s}>${v}`)) continue;
      const face: string[] = [];
      let de = s;
      let vers = v;
      while (!visitees.has(`${de}>${vers}`)) {
        visitees.add(`${de}>${vers}`);
        face.push(de);
        // Au sommet d'arrivée : l'arête juste avant le retour, dans l'ordre angulaire.
        const autour = tries.get(vers)!;
        const i = autour.indexOf(de);
        const suivant = autour[(i - 1 + autour.length) % autour.length]!;
        de = vers;
        vers = suivant;
      }
      faces.push(face);
    }
  }

  return faces
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

/**
 * Remet à jour les pièces du niveau après une modification des murs : une pièce détectée
 * garde le nom, le type et les revêtements de la pièce existante qu'elle contient.
 */
export function synchroniserPieces(
  existantes: readonly Piece[],
  detectees: readonly PieceDetectee[],
  nouvelId: () => string,
): Piece[] {
  const prises = new Set<string>();
  return detectees.map((d, i) => {
    const ancienne = existantes.find(
      (p) => !prises.has(p.id) && pointDansPolygone(centroide(p.contour), d.contour),
    );
    if (ancienne) {
      prises.add(ancienne.id);
      return { ...ancienne, contour: d.contour };
    }
    return {
      id: nouvelId(),
      contour: d.contour,
      nom: `Pièce ${i + 1}`,
      type: 'autre',
      sol: { famille: 'aucun' },
      plafond: { famille: 'aucun' },
      zonesBasses: [],
    };
  });
}

/** Surface Carrez (DES-11) : surface au sol moins les zones sous 1,80 m, en mm². */
export function surfaceCarrez(p: Pick<Piece, 'contour' | 'zonesBasses'>): number {
  const basse = p.zonesBasses.reduce((s, z) => s + aire(z), 0);
  return Math.max(0, Math.round(aire(p.contour) - basse));
}

/** Types de pièce (DES-11), dans l'ordre du menu. */
export const LIBELLES_PIECE: Record<Piece['type'], string> = {
  sejour: 'Séjour',
  cuisine: 'Cuisine',
  chambre: 'Chambre',
  salle_de_bain: 'Salle de bains',
  salle_d_eau: 'Salle d’eau',
  wc: 'WC',
  entree: 'Entrée',
  couloir: 'Couloir',
  bureau: 'Bureau',
  buanderie: 'Buanderie',
  dressing: 'Dressing',
  cellier: 'Cellier',
  garage: 'Garage',
  combles: 'Combles',
  autre: 'Autre',
};

/**
 * Type d'une pièce (DES-11). Une pièce encore nommée « Pièce N » prend le nom de son type ;
 * un nom choisi par l'utilisateur est gardé.
 */
export function typerPiece(n: Niveau, pieceId: string, type: Piece['type']): Resultat<Niveau> {
  if (!n.pieces.some((p) => p.id === pieceId)) return echec('INTROUVABLE');
  return succes({
    ...n,
    pieces: n.pieces.map((p) =>
      p.id === pieceId
        ? {
            ...p,
            type,
            nom: /^Pièce \d+$/.test(p.nom) && type !== 'autre' ? LIBELLES_PIECE[type] : p.nom,
          }
        : p,
    ),
  });
}
