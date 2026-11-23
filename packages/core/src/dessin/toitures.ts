import type { Niveau, Point } from '../schemas/dessinScene';
import { ailesDuNiveau, monde, repereMaison } from './ailesToit';

/**
 * Toiture générée depuis le contour des murs (DES-16, DES-17) : emprise rectangulaire dans
 * le sens du faîtage, pans en 3D, pignons, gouttières, hauteur sous toiture (combles Carrez).
 * Repère local : a le long du faîtage, b en travers, z au-dessus du haut des murs.
 */
export type Toiture = NonNullable<Niveau['toiture']>;
export type TypeToiture = Toiture['type'];
export type Point3 = { x: number; y: number; z: number };

export const LIBELLES_TOITURE: Record<TypeToiture, string> = {
  deux_pans: 'Deux pans',
  quatre_pans: 'Quatre pans',
  croupe: 'Croupe',
  monopente: 'Monopente',
  plate: 'Toit plat',
  mansarde: 'Mansarde',
};
/** Pente par défaut (°) à la création ; un toit plat garde 2 % d'écoulement (≈ 1°). */
export const PENTE_DEFAUT: Record<TypeToiture, number> = {
  deux_pans: 35,
  quatre_pans: 30,
  croupe: 35,
  monopente: 15,
  plate: 1,
  mansarde: 30,
};
/** Pente du brisis d'une mansarde, et part de la profondeur qu'il occupe de chaque côté. */
const BRISIS = { pente: 70, part: 0.18 };
const ACROTERE = 400;

export type Cote = 'exterieur' | 'interieur' | 'etage';

/** Une aile du toit dans son repère local : a le long du faîtage, b en travers. */
export interface Emprise {
  /** Repère stable de la partie (limites en cm) : ses réglages propres (`toiture.parties`). */
  cle: string;
  centre: Point;
  u: Point;
  v: Point;
  /** Dimensions aux murs. */
  L0: number;
  P0: number;
  /** Limites avec débords (débord seulement sur les côtés extérieurs). */
  aMin: number;
  aMax: number;
  bMin: number;
  bMax: number;
  /** Côtés locaux : a-, a+, b-, b+. */
  cotes: { a0: Cote; a1: Cote; b0: Cote; b1: Cote };
  /** Forme de cette aile (appentis contre l'étage : monopente) et sens de montée (b+ ou b-). */
  type: TypeToiture;
  sens: 1 | -1;
  /** Altitude du haut des murs (base du toit) et hauteur des murs au-dessus du sol du niveau. */
  base: number;
  hMurs: number;
  /** Relevé du toit au-dessus du haut des murs (surcroît), en mm : voir `surcroitDe`. */
  surcroit?: number;
  /**
   * Pente maximale (tangente) de cette aile : un appentis contre l'étage s'arrête sous ses
   * fenêtres, quitte à être moins pentu que le reste du toit (légère cassure de pente).
   */
  kMax?: number;
}

/** Haut d'un appentis : 80 cm au-dessus du plancher de l'étage, sous ses fenêtres (mm). */
const HAUT_APPENTIS = 800;
/** Pente minimale d'un appentis (tuiles) : 10°. */
const K_APPENTIS_MIN = Math.tan((10 * Math.PI) / 180);

/** Hauteur des murs extérieurs du niveau (égout du toit). */
const hauteurMurs = (n: Pick<Niveau, 'murs'>) =>
  Math.max(0, ...n.murs.filter((m) => m.type === 'mur').map((m) => m.hauteur));

/** Ailes du toit d'un niveau (L, T, U, H ; partie sous l'étage exclue, appentis contre lui). */
export function emprisesToit(n: Niveau, dessus: Niveau | null = null): Emprise[] {
  const t = n.toiture;
  if (!t || n.murs.length < 3) return [];
  const r = repereMaison(n);
  const hMurs = hauteurMurs(n) || Math.max(...n.murs.map((m) => m.hauteur));
  return ailesDuNiveau(n, dessus, r).map((w) => {
    const cle = [w.a0, w.a1, w.b0, w.b1].map((x) => Math.round(x / 10)).join(':');
    const partie = t.parties.find((p) => p.cle === cle);
    // Faîtage tourné pour tout le toit, puis éventuellement pour cette partie seule.
    const tourne = (t.faitageAngle === 900) !== Boolean(partie?.tourner);
    const selonA = tourne ? !w.selonA : w.selonA;
    const centre = monde(r, (w.a0 + w.a1) / 2, (w.b0 + w.b1) / 2);
    const [u, v] = selonA ? [r.u, r.v] : [r.v, { x: -r.u.x, y: -r.u.y }];
    const cotes = selonA
      ? { a0: w.cotes.a0, a1: w.cotes.a1, b0: w.cotes.b0, b1: w.cotes.b1 }
      : { a0: w.cotes.b0, a1: w.cotes.b1, b0: w.cotes.a1, b1: w.cotes.a0 };
    const [L0, P0] = selonA ? [w.a1 - w.a0, w.b1 - w.b0] : [w.b1 - w.b0, w.a1 - w.a0];
    const deb = (c: Cote) => (c === 'exterieur' ? t.debord : 0);
    const appentis = t.type !== 'plate' && (cotes.b0 === 'etage' || cotes.b1 === 'etage');
    const aile: Emprise = {
      cle,
      centre,
      u,
      v,
      L0,
      P0,
      aMin: -L0 / 2 - deb(cotes.a0),
      aMax: L0 / 2 + deb(cotes.a1),
      bMin: -P0 / 2 - deb(cotes.b0),
      bMax: P0 / 2 + deb(cotes.b1),
      cotes,
      type: appentis ? 'monopente' : (partie?.type ?? t.type),
      sens: appentis && cotes.b0 === 'etage' ? -1 : 1,
      base: n.altitude + hMurs,
      hMurs,
      ...(appentis && dessus
        ? {
            kMax: Math.max(
              K_APPENTIS_MIN,
              // Débord bas compris : le surcroît relève l'appentis d'autant.
              (dessus.altitude + HAUT_APPENTIS - (n.altitude + hMurs)) / Math.max(1, P0 + t.debord),
            ),
          }
        : {}),
    };
    return { ...aile, surcroit: Math.round(surcroitDe(t, aile)) };
  });
}

/** Aile unique (ancienne API, tests) : première aile du niveau. */

const tan = (deg: number) => Math.tan((deg * Math.PI) / 180);
const penteDe = (t: Toiture) => t.pentes[0]! / 10;

/**
 * Hauteur du toit au-dessus du haut des murs au point local (a, b) ; négative dans les débords.
 * Les pans ont tous la même pente (sauf brisis de mansarde et croupe, plus raide).
 */
type FormeAile = Pick<Emprise, 'L0' | 'P0'> &
  Partial<Pick<Emprise, 'cotes' | 'type' | 'sens' | 'kMax' | 'surcroit'>>;

export function hauteurLocale(t: Toiture, e: FormeAile, a: number, b: number): number {
  return (e.surcroit ?? 0) + hauteurBrute(t, e, a, b);
}

/**
 * Surcroît (mm) : le toit est relevé pour que le bout des débords d'égout arrive au haut des
 * murs, au lieu de descendre devant les fenêtres de l'étage ; une bande de mur le ferme.
 */
export function surcroitDe(t: Toiture, e: FormeAile & Pick<Emprise, 'bMin' | 'bMax'>): number {
  return Math.max(0, -hauteurBrute(t, e, 0, e.bMin), -hauteurBrute(t, e, 0, e.bMax));
}

function hauteurBrute(t: Toiture, e: FormeAile, a: number, b: number): number {
  const k = Math.min(tan(penteDe(t)), e.kMax ?? Infinity);
  const versB = e.P0 / 2 - Math.abs(b);
  // Croupe ou quatre pans : la pente de bout n'existe qu'aux bouts libres (pas contre une aile).
  const libre = (c: Cote | undefined) => c === undefined || c === 'exterieur';
  const versA =
    a < 0
      ? libre(e.cotes?.a0)
        ? e.L0 / 2 + a
        : Infinity
      : libre(e.cotes?.a1)
        ? e.L0 / 2 - a
        : Infinity;
  switch (e.type ?? t.type) {
    case 'deux_pans':
      return versB * k;
    case 'quatre_pans':
      return Math.min(versB, versA) * k;
    case 'croupe':
      return Math.min(versB * k, versA * k * 2);
    case 'monopente':
      return ((e.sens ?? 1) * b + e.P0 / 2) * k;
    case 'plate':
      return 0;
    case 'mansarde': {
      const largeurBrisis = e.P0 * BRISIS.part;
      const hBrisis = largeurBrisis * tan(BRISIS.pente);
      return versB <= largeurBrisis
        ? versB * tan(BRISIS.pente)
        : hBrisis + (versB - largeurBrisis) * k;
    }
  }
}

/** Repère local → plan + altitude. */
export const versMonde = (e: Emprise, a: number, b: number, z: number): Point3 => ({
  x: e.centre.x + e.u.x * a + e.v.x * b,
  y: e.centre.y + e.u.y * a + e.v.y * b,
  z: e.base + z,
});
/** Plan → repère local. */
export const versLocal = (e: Emprise, p: Point) => {
  const d = { x: p.x - e.centre.x, y: p.y - e.centre.y };
  return { a: d.x * e.u.x + d.y * e.u.y, b: d.x * e.v.x + d.y * e.v.y };
};

/** Aire d'un polygone 3D plan (méthode de Newell), en mm². */
export function aire3D(poly: readonly Point3[]): number {
  let [nx, ny, nz] = [0, 0, 0];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    nx += (p.y - q.y) * (p.z + q.z);
    ny += (p.z - q.z) * (p.x + q.x);
    nz += (p.x - q.x) * (p.y + q.y);
  });
  return Math.hypot(nx, ny, nz) / 2;
}

/** Altitude du toit au point du plan : la plus haute des ailes qui le couvrent, sinon `null`. */
export function altitudeToit(
  t: Toiture,
  ailes: readonly Emprise[],
  p: Point,
): { z: number; aile: Emprise } | null {
  let mieux: { z: number; aile: Emprise } | null = null;
  for (const e of ailes) {
    const { a, b } = versLocal(e, p);
    if (a < e.aMin || a > e.aMax || b < e.bMin || b > e.bMax) continue;
    const z = e.base + hauteurLocale(t, e, a, b);
    if (!mieux || z > mieux.z) mieux = { z, aile: e };
  }
  return mieux;
}

/**
 * Parcourt l'emprise du toit sur une grille (pas en mm) : surface de couverture réelle (pente
 * comprise, ailes réunies) et combles où l'on tient à 1,80 m (Carrez), en mm².
 */
export function mesurerToit(t: Toiture, ailes: readonly Emprise[], altitudeSol: number, pas = 100) {
  let couverture = 0;
  let carrez = 0;
  const coins = ailes.flatMap((e) =>
    [
      [e.aMin, e.bMin],
      [e.aMax, e.bMax],
      [e.aMin, e.bMax],
      [e.aMax, e.bMin],
    ].map(([a, b]) => versMonde(e, a!, b!, 0)),
  );
  if (!coins.length) return { couverture: 0, carrez: 0 };
  const [x0, x1] = [Math.min(...coins.map((c) => c.x)), Math.max(...coins.map((c) => c.x))];
  const [y0, y1] = [Math.min(...coins.map((c) => c.y)), Math.max(...coins.map((c) => c.y))];
  for (let x = x0 + pas / 2; x < x1; x += pas)
    for (let y = y0 + pas / 2; y < y1; y += pas) {
      const ici = altitudeToit(t, ailes, { x, y });
      if (!ici) continue;
      const e = ici.aile;
      const { a, b } = versLocal(e, { x, y });
      const d = 5;
      const ga = (hauteurLocale(t, e, a + d, b) - hauteurLocale(t, e, a - d, b)) / (2 * d);
      const gb = (hauteurLocale(t, e, a, b + d) - hauteurLocale(t, e, a, b - d)) / (2 * d);
      couverture += pas * pas * Math.sqrt(1 + ga * ga + gb * gb);
      const dansLesMurs = Math.abs(a) <= e.L0 / 2 && Math.abs(b) <= e.P0 / 2;
      if (dansLesMurs && ici.z - altitudeSol >= 1_800) carrez += pas * pas;
    }
  return { couverture: Math.round(couverture), carrez };
}

export { ACROTERE, BRISIS };
