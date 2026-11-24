import type { Niveau, Point } from '../schemas/dessinScene';
import { acroteres } from './acroteres';
import { fermeturesSousLeToit } from './fermeturesToit';
import { pansVisibles } from './decoupeToit';
import { egoutsLocaux, mursLocaux, pansLocaux } from './pansToit';
import {
  altitudeToit,
  emprisesToit,
  hauteurLocale,
  mesurerToit,
  versLocal,
  versMonde,
  type Emprise,
  type Point3,
  type Toiture,
} from './toitures';
import type { Pave } from './volumes';

/** Pavé incliné (fenêtre de toit) : `inclinaison` autour de son axe l, en radians. */
export interface PaveIncline extends Pave {
  inclinaison: number;
}

export interface Toit3D {
  ailes: Emprise[];
  pans: Point3[][];
  /** Pignons, mur haut d'une monopente, acrotères d'un toit plat. */
  murs: Point3[][];
  gouttieres: [Point3, Point3][];
  fenetres: PaveIncline[];
  cheminees: Pave[];
  lucarnes: Pave[];
  /** Surface de couverture (mm²), gouttières (mm), combles à 1,80 m et plus (mm²). */
  surface: number;
  longueurGouttieres: number;
  carrez: number;
  /** Altitudes depuis le sol : égout (haut des murs) et faîtage (point le plus haut). */
  egout: number;
  faitage: number;
}

/** Pente au point dans l'aile qui le couvre : direction de la plus grande pente et angle. */
function penteEn(t: Toiture, e: Emprise, p: Point) {
  const { a, b } = versLocal(e, p);
  const d = 10;
  const ga = (hauteurLocale(t, e, a + d, b) - hauteurLocale(t, e, a - d, b)) / (2 * d);
  const gb = (hauteurLocale(t, e, a, b + d) - hauteurLocale(t, e, a, b - d)) / (2 * d);
  const g = Math.hypot(ga, gb);
  const bas = g ? { x: -(e.u.x * ga + e.v.x * gb) / g, y: -(e.u.y * ga + e.v.y * gb) / g } : e.v;
  return { pente: Math.atan(g), angle: Math.atan2(bas.y, bas.x) - Math.PI / 2 };
}

/** Parties d'une gouttière qui ne passent pas sous le toit d'une autre aile (noues, creux du L). */
function aLAirLibre(t: Toiture, ailes: Emprise[], aile: Emprise, [p, q]: [Point3, Point3]) {
  const autres = ailes.filter((x) => x !== aile);
  const pas = 50;
  const n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / pas));
  const point = (k: number): Point3 => ({
    x: p.x + ((q.x - p.x) * k) / n,
    y: p.y + ((q.y - p.y) * k) / n,
    z: p.z + ((q.z - p.z) * k) / n,
  });
  const libre = (k: number) => {
    const c = point(k);
    const dessus = altitudeToit(t, autres, c);
    return !dessus || dessus.z <= c.z + 20;
  };
  const morceaux: [Point3, Point3][] = [];
  let debut: number | null = null;
  for (let k = 0; k <= n; k++) {
    if (libre(k)) debut ??= k;
    if ((!libre(k) || k === n) && debut !== null) {
      const fin = libre(k) ? k : k - 1;
      if (fin > debut) morceaux.push([point(debut), point(fin)]);
      debut = null;
    }
  }
  return morceaux;
}

/**
 * Toit d'un niveau en 3D (DES-16, DES-17) : une aile par partie de la maison (L, T, U, H),
 * réunies en noues ; la partie sous l'étage du dessus n'est pas couverte, un appentis s'y adosse.
 */
export function toit3D(n: Niveau, dessus: Niveau | null = null): Toit3D | null {
  const t = n.toiture;
  if (!t) return null;
  const ailes = emprisesToit(n, dessus);
  if (!ailes.length) return null;
  const parAile: Point3[][][] = [];
  const murs: Point3[][] = [];
  const gouttieres: [Point3, Point3][] = [];
  for (const e of ailes) {
    const z = (a: number, b: number) => hauteurLocale(t, e, a, b);
    parAile.push(pansLocaux(t, e).map((poly) => poly.map(([a, b]) => versMonde(e, a, b, z(a, b)))));
    // Pignon caché sous le toit d'une autre partie : inutile ; sinon il ferme le toit.
    const autres = ailes.filter((o) => o !== e);
    // Points le long des bords (pas seulement les coins : une bande dont les deux bouts sont
    // sous une autre aile peut être à découvert en son milieu).
    const lePourtour = (poly: Point3[]) =>
      poly.flatMap((p, i) => {
        const q = poly[(i + 1) % poly.length]!;
        return [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((k) => ({
          x: p.x + (q.x - p.x) * k,
          y: p.y + (q.y - p.y) * k,
          z: p.z + (q.z - p.z) * k,
        }));
      });
    const visible = (poly: Point3[]) =>
      lePourtour(poly).some(
        (p) => p.z > e.base + 10 && (altitudeToit(t, autres, p)?.z ?? -Infinity) < p.z - 5,
      );
    murs.push(...mursLocaux(t, e).filter(visible));
    for (const [p, q] of egoutsLocaux(e))
      gouttieres.push(
        ...aLAirLibre(t, ailes, e, [
          versMonde(e, p![0], p![1], z(p![0], p![1])),
          versMonde(e, q![0], q![1], z(q![0], q![1])),
        ]),
      );
  }
  murs.push(...acroteres(n, dessus, ailes));
  // Aucun vide entre le haut des murs et le toit (mur en biais, angle rentrant…).
  murs.push(...fermeturesSousLeToit(n, dessus, t, ailes, murs));
  // Toits des ailes réunis : rien ne dépasse sous le toit d'une autre aile.
  const pans = pansVisibles(parAile);
  const faitage = Math.max(...pans.flat().map((p) => p.z));
  const surLeToit = (p: Point) => altitudeToit(t, ailes, p);
  const mesures = mesurerToit(t, ailes, n.altitude);
  return {
    ailes,
    pans,
    murs,
    gouttieres,
    fenetres: t.fenetresToit.flatMap((f) => {
      const ici = surLeToit(f.position);
      if (!ici) return [];
      const s = penteEn(t, ici.aile, f.position);
      return [
        {
          centre: { x: f.position.x, y: f.position.y, z: ici.z + 40 },
          taille: { l: f.largeur, p: f.hauteur, h: 60 },
          angle: s.angle,
          inclinaison: s.pente,
        },
      ];
    }),
    cheminees: t.cheminees.flatMap((c) => {
      const ici = surLeToit(c.position);
      if (!ici) return [];
      const [bas, haut] = [ici.z - 300, faitage + 600];
      return [
        {
          centre: { x: c.position.x, y: c.position.y, z: (bas + haut) / 2 },
          taille: { l: c.largeur, p: c.profondeur, h: haut - bas },
          angle: Math.atan2(ici.aile.u.y, ici.aile.u.x),
        },
      ];
    }),
    lucarnes: t.lucarnes.flatMap((l) => {
      const ici = surLeToit(l.position);
      if (!ici) return [];
      const h = 1_300;
      return [
        {
          centre: { x: l.position.x, y: l.position.y, z: ici.z + h / 2 - 200 },
          taille: { l: l.largeur, p: 1_200, h },
          angle: penteEn(t, ici.aile, l.position).angle,
        },
      ];
    }),
    surface: mesures.couverture,
    carrez: mesures.carrez,
    longueurGouttieres: Math.round(
      gouttieres.reduce((s, [p, q]) => s + Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z), 0),
    ),
    egout: Math.min(...ailes.map((e) => e.base)),
    faitage: Math.round(faitage),
  };
}
