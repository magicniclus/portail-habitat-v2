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

/**
 * Arbre, arbuste ou haie : hors du bâti ; recule pour garder `degagement` mm entre sa ramure
 * et la façade (un arbre ne se plante pas contre la maison).
 */
export function placerVegetal(
  n: Niveau,
  p: Point,
  diametre: number,
  aimant = true,
  degagement = 0,
): Point | string {
  const occupe = dans(p, obstacles(n));
  if (occupe) return `Plantez-le hors de ${occupe.nom}.`;
  const f = facadeLaPlusProche(n, p);
  const r = diametre / 2 + degagement;
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

/**
 * Terrasse autour d'une piscine (plage de `largeur` mm), prolongée jusqu'à la façade la plus
 * proche si elle est à moins de 6 m : la piscine se retrouve encastrée dans la terrasse.
 */
export function rectanglePlage(
  n: Niveau,
  contour: readonly Point[],
  largeur = 1_200,
): [Point, Point] {
  const xs = contour.map((p) => p.x);
  const ys = contour.map((p) => p.y);
  let [x0, x1, y0, y1] = [
    Math.min(...xs) - largeur,
    Math.max(...xs) + largeur,
    Math.min(...ys) - largeur,
    Math.max(...ys) + largeur,
  ];
  const pts = maison(n).flat();
  if (pts.length) {
    const [mx0, mx1] = [Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x))];
    const [my0, my1] = [Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.y))];
    // Écart entre la piscine et chaque façade, si elle est en face : la plage va jusqu'au mur
    // (même quand la piscine est à moins de 1,20 m, elle s'arrête à la façade).
    const [px0, px1, py0, py1] = [x0 + largeur, x1 - largeur, y0 + largeur, y1 - largeur];
    const enX = Math.min(px1, mx1) > Math.max(px0, mx0);
    const enY = Math.min(py1, my1) > Math.max(py0, my0);
    const ecarts: [number, () => void][] = [];
    if (enX && py0 >= my1) ecarts.push([py0 - my1, () => (y0 = my1)]);
    if (enX && py1 <= my0) ecarts.push([my0 - py1, () => (y1 = my0)]);
    if (enY && px0 >= mx1) ecarts.push([px0 - mx1, () => (x0 = mx1)]);
    if (enY && px1 <= mx0) ecarts.push([mx0 - px1, () => (x1 = mx0)]);
    const proche = ecarts.sort((a, b) => a[0] - b[0])[0];
    if (proche && proche[0] <= 6_000) proche[1]();
  }
  return [
    { x: Math.round(x0), y: Math.round(y0) },
    { x: Math.round(x1), y: Math.round(y1) },
  ];
}

/** Côtés d'un contour (terrasse) collés à la maison : pas de garde-corps contre un mur. */
export function cotesContreLaMaison(n: Niveau, contour: readonly Point[]): boolean[] {
  const bati = maison(n);
  const cx = contour.reduce((s, p) => s + p.x, 0) / contour.length;
  const cy = contour.reduce((s, p) => s + p.y, 0) / contour.length;
  return aretes(contour).map(([a, b]) => {
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const l = Math.hypot(b.y - a.y, b.x - a.x) || 1;
    let [nx, ny] = [-(b.y - a.y) / l, (b.x - a.x) / l];
    if ((m.x - cx) * nx + (m.y - cy) * ny < 0) [nx, ny] = [-nx, -ny];
    const dehors = { x: m.x + nx * 150, y: m.y + ny * 150 };
    return bati.some((poly) => pointDansPolygone(dehors, poly));
  });
}
