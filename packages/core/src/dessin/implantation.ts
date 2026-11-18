import { LIMITE_MM, type Point, type Scene } from '../schemas/dessinScene';
import { echec, succes, type Resultat } from '../resultat';
import { distance, projeter } from './geometrie';
import { contourMur } from './murs';

/**
 * Implantation (DES-35) : la parcelle du cadastre posée autour de la maison. Coordonnées
 * Lambert-93 (EPSG:2154) en millimètres ; le plan garde ses millimètres locaux, reliés au
 * Lambert-93 par `terrain.georef` (point 0,0 du plan) et `orientationNord`.
 */
export interface PointL93 {
  x: number;
  y: number;
}

// Projection conique conforme Lambert-93 (ellipsoïde GRS80, constantes publiées par l'IGN).
const E = 0.0818191910428158;
const N = 0.725607765053267;
const C = 11_754_255.426096;
const XS = 700_000;
const YS = 12_655_612.049876;
const LAMBDA0 = (3 * Math.PI) / 180;

/** Longitude, latitude (degrés, WGS84 ≈ RGF93) → Lambert-93 en millimètres. */
export function versLambert93(lon: number, lat: number): PointL93 {
  const phi = (lat * Math.PI) / 180;
  const s = Math.sin(phi);
  const iso = Math.log(Math.tan(Math.PI / 4 + phi / 2) * ((1 - E * s) / (1 + E * s)) ** (E / 2));
  const r = C * Math.exp(-N * iso);
  const g = N * ((lon * Math.PI) / 180 - LAMBDA0);
  return {
    x: Math.round((XS + r * Math.sin(g)) * 1000),
    y: Math.round((YS - r * Math.cos(g)) * 1000),
  };
}

/**
 * Passage Lambert-93 ↔ plan : le nord est tourné de `orientation` (dixièmes de degré, sens
 * horaire) par rapport au haut du plan, dont l'axe y descend. La matrice est sa propre inverse.
 */
const matrice = (orientation: number) => {
  const t = (orientation / 10) * (Math.PI / 180);
  const [c, s] = [Math.cos(t), Math.sin(t)];
  return (v: Point): Point => ({ x: v.x * c + v.y * s, y: v.x * s - v.y * c });
};
export function l93VersPlan(q: PointL93, georef: PointL93, orientation: number): Point {
  const p = matrice(orientation)({ x: q.x - georef.x, y: q.y - georef.y });
  return { x: Math.round(p.x) + 0, y: Math.round(p.y) + 0 };
}
export function planVersL93(p: Point, georef: PointL93, orientation: number): PointL93 {
  const v = matrice(orientation)(p);
  return { x: Math.round(georef.x + v.x), y: Math.round(georef.y + v.y) };
}

/** Centre de la maison (milieu de l'emprise des murs de tous les niveaux), sinon l'origine. */
export function centreMaison(s: Pick<Scene, 'niveaux'>): Point {
  const pts = s.niveaux.flatMap((n) => n.murs.flatMap((m) => [m.a, m.b]));
  if (!pts.length) return { x: 0, y: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
    y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
  };
}

export interface ParcelleCadastre {
  /** Référence cadastrale (ex. « 75056000AB0012 »). */
  reference: string;
  codeInsee: string;
  /** Contour en Lambert-93 (mm), sans le point de fermeture répété. */
  contour: PointL93[];
  /** Photo aérienne enregistrée dans le dossier du plan, et son emprise en Lambert-93 (mm). */
  orthophoto?: { storagePath: string; emprise: { x0: number; y0: number; x1: number; y1: number } };
}

const dansLaLimite = (pts: readonly Point[]) =>
  pts.every((p) => Math.abs(p.x) <= LIMITE_MM && Math.abs(p.y) <= LIMITE_MM);

/** Pose la parcelle du cadastre : son centre sur le centre de la maison, nord inchangé. */
export function implanterParcelle(s: Scene, p: ParcelleCadastre): Resultat<Scene> {
  if (p.contour.length < 3 || p.contour.length > 500)
    return echec('PRECONDITION', { message: 'Contour de parcelle illisible.' });
  const xs = p.contour.map((q) => q.x);
  const ys = p.contour.map((q) => q.y);
  const centre = {
    x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
    y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
  };
  // georef tel que le centre de la parcelle tombe sur le centre de la maison.
  const decale = planVersL93(centreMaison(s), { x: 0, y: 0 }, s.orientationNord);
  const georef = { x: centre.x - decale.x, y: centre.y - decale.y };
  const parcelle = p.contour.map((q) => l93VersPlan(q, georef, s.orientationNord));
  if (!dansLaLimite(parcelle))
    return echec('PRECONDITION', { message: 'Parcelle trop grande pour le plan (2 km au plus).' });
  return succes({
    ...s,
    terrain: {
      parcelle,
      referenceCadastrale: p.reference.slice(0, 40),
      ...(/^\d[0-9AB]\d{3}$/.test(p.codeInsee) ? { codeInsee: p.codeInsee } : {}),
      implantation: { x: 0, y: 0, rotation: 0 },
      georef,
      ...(p.orthophoto ? { orthophoto: p.orthophoto } : {}),
    },
  });
}

/**
 * Déplace ou fait pivoter la parcelle sous la maison (la maison ne bouge pas) : `decalage` en
 * mm du plan, `rotation` en dixièmes de degré (sens horaire, autour du centre de la maison).
 * Le nord tourne avec la parcelle ; le Lambert-93 du plan suit.
 */
export function ajusterImplantation(
  s: Scene,
  { decalage = { x: 0, y: 0 }, rotation = 0 }: { decalage?: Point; rotation?: number },
): Resultat<Scene> {
  const t = s.terrain;
  if (!t) return echec('PRECONDITION', { message: 'Définissez d’abord la parcelle.' });
  const g = t.georef ?? { x: 0, y: 0 };
  const avant = s.orientationNord;
  const apres = (((avant + rotation) % 3600) + 3600) % 3600;
  const pivot = centreMaison(s);
  // Lambert-93 du pivot inchangé par la rotation, puis translation de la parcelle.
  const qPivot = planVersL93(pivot, g, avant);
  const tourne = planVersL93(pivot, { x: 0, y: 0 }, apres);
  const g1 = { x: qPivot.x - tourne.x, y: qPivot.y - tourne.y };
  const d = planVersL93(decalage, { x: 0, y: 0 }, apres);
  const g2 = { x: g1.x - d.x, y: g1.y - d.y };
  const parcelle = t.parcelle.map((p) => l93VersPlan(planVersL93(p, g, avant), g2, apres));
  if (!dansLaLimite(parcelle))
    return echec('PRECONDITION', { message: 'La parcelle sortirait du plan.' });
  return succes({
    ...s,
    orientationNord: apres,
    terrain: { ...t, parcelle, ...(t.georef ? { georef: g2 } : {}) },
  });
}

/** Coins de la photo aérienne dans le plan (haut-gauche, haut-droit, bas-gauche). */
export function coinsOrthophoto(s: Pick<Scene, 'terrain' | 'orientationNord'>) {
  const t = s.terrain;
  if (!t?.orthophoto || !t.georef) return null;
  const { x0, y0, x1, y1 } = t.orthophoto.emprise;
  const v = (x: number, y: number) => l93VersPlan({ x, y }, t.georef!, s.orientationNord);
  return { hg: v(x0, y1), hd: v(x1, y1), bg: v(x0, y0), bd: v(x1, y0) };
}

export interface CoteLimite {
  a: Point;
  b: Point;
  d: number;
}

/**
 * Distances de la maison aux limites (plan de masse) : pour chaque côté de la parcelle, le
 * point de la maison le plus proche ; les `max` plus courtes. Indicatif, pas un avis d'urbanisme.
 */
export function distancesAuxLimites(s: Scene, max = 4): CoteLimite[] {
  const parcelle = s.terrain?.parcelle;
  const n = s.niveaux[0];
  if (!parcelle || !n) return [];
  const coins = n.murs.filter((m) => m.type === 'mur').flatMap((m) => contourMur(m));
  if (!coins.length) return [];
  const cotes: CoteLimite[] = parcelle.map((a, i) => {
    const b = parcelle[(i + 1) % parcelle.length]!;
    let mieux: CoteLimite | null = null;
    for (const p of coins) {
      const q = projeter(p, a, b).point;
      const d = distance(p, q);
      if (!mieux || d < mieux.d) mieux = { a: p, b: q, d };
    }
    const r = mieux!;
    return {
      a: { x: Math.round(r.a.x), y: Math.round(r.a.y) },
      b: { x: Math.round(r.b.x), y: Math.round(r.b.y) },
      d: Math.round(r.d),
    };
  });
  return cotes
    .filter((c) => c.d > 0)
    .sort((x, y) => x.d - y.d)
    .slice(0, max);
}
