import type { Niveau, Point, Scene } from '../schemas/dessinScene';
import { ailesDuNiveau, repereMaison } from './ailesToit';
import { distance, intersectionSegments, pointDansPolygone, projeter } from './geometrie';
import { contourMur } from './murs';
import { contourPiscine } from './formePiscine';

/**
 * Placement de l'extérieur (DES-18 à DES-20), comme pour les meubles : rien ne se pose dans
 * la maison ; un arbre recule jusqu'à ce que sa ramure touche la façade ; une terrasse proche
 * se colle à la façade ; une clôture ne traverse ni maison, ni terrasse, ni piscine et s'aligne
 * sur la limite de parcelle toute proche.
 */
const ACCROCHE_TERRASSE = 600;
const ACCROCHE_LIMITE = 1_000;

type Bati = { nom: string; poly: Point[] };

/** Polygones de la maison (pièces et murs). */
const maison = (n: Niveau): Point[][] => [
  ...n.pieces.map((p) => p.contour),
  ...n.murs.filter((m) => m.type !== 'separation' && m.type !== 'poutre').map((m) => contourMur(m)),
];

function obstacles(n: Niveau, avecTerrasses = true): Bati[] {
  return [
    ...maison(n).map((poly) => ({ nom: 'la maison', poly })),
    ...(avecTerrasses
      ? n.exterieur.terrasses.map((t) => ({ nom: 'la terrasse', poly: t.contour }))
      : []),
    ...n.exterieur.piscines.map((p) => ({ nom: 'la piscine', poly: contourPiscine(p) })),
  ];
}
const dans = (p: Point, b: readonly Bati[]) => b.find((x) => pointDansPolygone(p, x.poly));
const aretes = (poly: readonly Point[]) =>
  poly.map((p, i) => [p, poly[(i + 1) % poly.length]!] as const);

/** Point le plus proche sur les façades de la maison, et sa distance. */
function facadeLaPlusProche(n: Niveau, p: Point): { point: Point; d: number } | null {
  let mieux: { point: Point; d: number } | null = null;
  for (const poly of maison(n))
    for (const [a, b] of aretes(poly)) {
      const q = projeter(p, a, b).point;
      const d = distance(p, q);
      if (!mieux || d < mieux.d) mieux = { point: q, d };
    }
  return mieux;
}

/** Arbre, arbuste ou haie : hors du bâti ; recule pour que la ramure touche juste la façade. */
export function placerVegetal(
  n: Niveau,
  p: Point,
  diametre: number,
  aimant = true,
): Point | string {
  const occupe = dans(p, obstacles(n));
  if (occupe) return `Plantez-le hors de ${occupe.nom}.`;
  const f = facadeLaPlusProche(n, p);
  const r = diametre / 2;
  if (!aimant || !f || f.d >= r || f.d === 0) return { x: Math.round(p.x), y: Math.round(p.y) };
  const k = r / f.d;
  return {
    x: Math.round(f.point.x + (p.x - f.point.x) * k),
    y: Math.round(f.point.y + (p.y - f.point.y) * k),
  };
}

/** Terrasse (rectangle a–b) : ne recouvre pas la maison ; un bord proche d'une façade s'y colle. */
export function placerTerrasse(
  n: Niveau,
  a: Point,
  b: Point,
  aimant = true,
): [Point, Point] | string {
  let [x0, x1, y0, y1] = [
    Math.min(a.x, b.x),
    Math.max(a.x, b.x),
    Math.min(a.y, b.y),
    Math.max(a.y, b.y),
  ];
  const r = repereMaison(n);
  const droit = Math.abs(r.u.y) < 0.01 || Math.abs(r.u.x) < 0.01;
  if (aimant && droit && n.murs.length)
    // Ailes de la maison, ramenées en x / y du plan (repère droit).
    for (const w of ailesDuNiveau(n, null, { u: { x: 1, y: 0 }, v: { x: 0, y: 1 } })) {
      const enY = Math.min(y1, w.b1) > Math.max(y0, w.b0);
      const enX = Math.min(x1, w.a1) > Math.max(x0, w.a0);
      if (enY && Math.abs(x0 - w.a1) <= ACCROCHE_TERRASSE) [x0, x1] = [w.a1, x1 + w.a1 - x0];
      else if (enY && Math.abs(x1 - w.a0) <= ACCROCHE_TERRASSE) [x0, x1] = [x0 + w.a0 - x1, w.a0];
      if (enX && Math.abs(y0 - w.b1) <= ACCROCHE_TERRASSE) [y0, y1] = [w.b1, y1 + w.b1 - y0];
      else if (enX && Math.abs(y1 - w.b0) <= ACCROCHE_TERRASSE) [y0, y1] = [y0 + w.b0 - y1, w.b0];
    }
  // Recouvrement : un point de la grille (tous les 25 cm, bords exclus) dans la maison.
  const bati = maison(n).map((poly) => ({ nom: 'la maison', poly }));
  for (let x = x0 + 125; x < x1; x += 250)
    for (let y = y0 + 125; y < y1; y += 250)
      if (dans({ x, y }, bati)) return 'La terrasse ne peut pas recouvrir la maison.';
  return [
    { x: Math.round(x0), y: Math.round(y0) },
    { x: Math.round(x1), y: Math.round(y1) },
  ];
}

/** Piscine : jamais sur la maison. */
export function piscineSurLaMaison(n: Niveau, contour: readonly Point[]): boolean {
  const bati = maison(n);
  return (
    contour.some((p) => bati.some((poly) => pointDansPolygone(p, poly))) ||
    bati.some((poly) => poly.some((p) => pointDansPolygone(p, contour)))
  );
}

/**
 * Point de clôture : aligné sur la limite de parcelle à moins d'un mètre (sommet d'abord).
 */
export function accrocherALaLimite(s: Pick<Scene, 'terrain'>, p: Point, aimant = true): Point {
  const parcelle = s.terrain?.parcelle;
  if (!aimant || !parcelle) return p;
  const sommet = parcelle.find((q) => distance(p, q) <= ACCROCHE_LIMITE);
  if (sommet) return sommet;
  let mieux: { q: Point; d: number } | null = null;
  for (const [a, b] of aretes(parcelle)) {
    const q = projeter(p, a, b).point;
    const d = distance(p, q);
    if (d <= ACCROCHE_LIMITE && (!mieux || d < mieux.d)) mieux = { q, d };
  }
  return mieux ? { x: Math.round(mieux.q.x), y: Math.round(mieux.q.y) } : p;
}

/** Tronçon de clôture qui traverserait le bâti : message, sinon `null`. */
export function clotureTraverse(n: Niveau, a: Point, b: Point): string | null {
  for (const x of obstacles(n)) {
    const coupe = aretes(x.poly).some(([c, d]) => intersectionSegments(a, b, c, d));
    const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (coupe || pointDansPolygone(milieu, x.poly) || pointDansPolygone(a, x.poly))
      return `La clôture traverserait ${x.nom}.`;
  }
  return null;
}
