import { echec, succes, type Resultat } from '../resultat';
import { escalier as schemaEscalier, type Niveau, type Point } from '../schemas/dessinScene';
import type { Contexte } from './commandes';
import { calculerMarches, type Escalier } from './escaliers';
import { radians } from './geometrie';

/**
 * Escalier tracé (DES-15), comme on le dessine : un clic au départ, un clic à chaque changement
 * de direction, un dernier à l'arrivée. La ligne de foulée (`chemin`) fixe la longueur ; le
 * nombre de marches vient de la hauteur à monter, leur profondeur (giron) de la longueur.
 * Aux virages : marches balancées qui tournent progressivement, ou palier carré.
 */

/** En dessous (mm), le tracé est un clic manqué, pas un escalier. */
const LONGUEUR_MIN = 1_000;
/** Arrondi au mm, sans « -0 ». */
const entier = (v: number) => Math.round(v) + 0;

type Troncon = { a: Point; b: Point; l: number; angle: number; debut: number };

function troncons(chemin: readonly Point[]): Troncon[] {
  let debut = 0;
  return chemin.slice(1).map((b, i) => {
    const a = chemin[i]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const t = { a, b, l, angle: Math.atan2(b.y - a.y, b.x - a.x), debut };
    debut += l;
    return t;
  });
}

const sur = (t: Troncon, s: number): Point => {
  const k = t.l ? (s - t.debut) / t.l : 0;
  return { x: t.a.x + (t.b.x - t.a.x) * k, y: t.a.y + (t.b.y - t.a.y) * k };
};
const ecartAngle = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Longueur de la ligne de foulée (mm). */
export const longueurChemin = (chemin: readonly Point[]) =>
  troncons(chemin).reduce((s, t) => s + t.l, 0);

/**
 * Point et direction de la foulée à la distance `s` ; balancé : la direction tourne
 * progressivement sur une demi-largeur de part et d'autre de chaque angle.
 */
function surLaFoulee(ts: readonly Troncon[], s: number, rayon: number) {
  const i = Math.max(
    0,
    ts.findIndex((t) => s <= t.debut + t.l),
  );
  const t = ts[i === -1 ? ts.length - 1 : i]!;
  let sens = t.angle;
  const avant = ts[i - 1];
  const apres = ts[i + 1];
  if (rayon > 0 && avant && s - t.debut < rayon) {
    const k = 0.5 + (s - t.debut) / (2 * rayon);
    sens = avant.angle + ecartAngle(avant.angle, t.angle) * k;
  } else if (rayon > 0 && apres && t.debut + t.l - s < rayon) {
    const k = 0.5 - (t.debut + t.l - s) / (2 * rayon);
    sens = t.angle + ecartAngle(t.angle, apres.angle) * k;
  }
  return { p: sur(t, s), sens };
}

export interface CentreMarche {
  local: Point;
  /** Direction de la montée (radians, repère de l'escalier). */
  sens: number;
  /** Profondeur de la marche le long de la foulée (mm). */
  profondeur: number;
  palier: boolean;
}

/** Bornes des marches le long de la foulée (distances), et paliers aux angles. */
function decoupage(e: Escalier): { bornes: [number, number][]; paliers: number[] } {
  const ts = troncons(e.chemin ?? []);
  const nb = e.nbMarches;
  if (e.virage !== 'palier' || ts.length < 2) {
    const pas = (ts.at(-1)!.debut + ts.at(-1)!.l) / nb;
    return { bornes: Array.from({ length: nb }, (_, k) => [k * pas, (k + 1) * pas]), paliers: [] };
  }
  // Palier : un carré de la largeur de l'escalier à chaque angle ; les marches sur le reste.
  const l = e.largeur;
  const utiles = ts.map((t, i) => ({
    de: t.debut + (i > 0 ? l / 2 : 0),
    a: t.debut + t.l - (i < ts.length - 1 ? l / 2 : 0),
  }));
  const longueurs = utiles.map((u) => Math.max(0, u.a - u.de));
  const total = longueurs.reduce((s, x) => s + x, 0) || 1;
  const aPoser = Math.max(ts.length, nb - (ts.length - 1));
  // Répartition au prorata des longueurs (plus forts restes), au moins une marche par volée.
  const parts = longueurs.map((x) => (x / total) * aPoser);
  const nbs = parts.map((x) => Math.max(1, Math.floor(x)));
  let reste = aPoser - nbs.reduce((s, x) => s + x, 0);
  const ordre = parts.map((x, i) => [x - Math.floor(x), i] as const).sort((x, y) => y[0] - x[0]);
  for (let k = 0; reste > 0; k = (k + 1) % ordre.length, reste--) nbs[ordre[k]![1]]! += 1;
  const bornes: [number, number][] = [];
  utiles.forEach((u, i) => {
    const pas = longueurs[i]! / nbs[i]!;
    for (let k = 0; k < nbs[i]!; k++) bornes.push([u.de + k * pas, u.de + (k + 1) * pas]);
  });
  return { bornes, paliers: ts.slice(1).map((t) => t.debut) };
}

/** Marches (et paliers) le long de la foulée, dans l'ordre de la montée. */
export function centresChemin(e: Escalier): CentreMarche[] {
  const ts = troncons(e.chemin ?? []);
  if (!ts.length) return [];
  const palier = e.virage === 'palier';
  const rayon = palier ? 0 : e.largeur / 2;
  const { bornes, paliers } = decoupage(e);
  const marches = bornes.map(([de, a]) => {
    const { p, sens } = surLaFoulee(ts, (de + a) / 2, rayon);
    return { local: p, sens, profondeur: a - de, palier: false, s: (de + a) / 2 };
  });
  const carres = paliers.map((s, i) => ({
    local: ts[i + 1]!.a,
    sens: ts[i]!.angle,
    profondeur: e.largeur,
    palier: true,
    s,
  }));
  return [...marches, ...carres]
    .sort((x, y) => x.s - y.s)
    .slice(0, e.nbMarches)
    .map(({ s: _s, ...c }) => c);
}

/** Emprise au sol (repère de l'escalier) : la foulée élargie, angles en onglet. */
export function empriseChemin(e: Escalier): Point[] {
  const ts = troncons(e.chemin ?? []);
  const d = e.largeur / 2;
  const normale = (a: number) => ({ x: -Math.sin(a), y: Math.cos(a) });
  const decale = (cote: 1 | -1) =>
    (e.chemin ?? []).map((p, i) => {
      const [t0, t1] = [ts[Math.max(0, i - 1)]!, ts[Math.min(ts.length - 1, i)]!];
      const [n0, n1] = [normale(t0.angle), normale(t1.angle)];
      const m = { x: n0.x + n1.x, y: n0.y + n1.y };
      const k = (d * cote) / (1 + n0.x * n1.x + n0.y * n1.y);
      return { x: entier(p.x - m.x * k), y: entier(p.y - m.y * k) };
    });
  return [...decale(1), ...decale(-1).reverse()];
}

/** Traits des marches vus de dessus (repère de l'escalier) : un trait entre deux marches. */
export function limitesMarchesChemin(e: Escalier): [Point, Point][] {
  const ts = troncons(e.chemin ?? []);
  const palier = e.virage === 'palier';
  const rayon = palier ? 0 : e.largeur / 2;
  const { bornes } = decoupage(e);
  const d = e.largeur / 2;
  const traits = new Set<number>();
  bornes.forEach(([de, a], i) => {
    if (i > 0 || palier) traits.add(entier(de));
    if (palier) traits.add(entier(a));
  });
  const total = ts.at(-1)!.debut + ts.at(-1)!.l;
  return [...traits]
    .filter((s) => s > 1 && s < total - 1)
    .map((s) => {
      const { p, sens } = surLaFoulee(ts, s, rayon);
      const n = { x: -Math.sin(sens) * d, y: Math.cos(sens) * d };
      return [
        { x: entier(p.x + n.x), y: entier(p.y + n.y) },
        { x: entier(p.x - n.x), y: entier(p.y - n.y) },
      ];
    });
}

/** Giron d'un escalier tracé : longueur utile divisée par le nombre de marches. */
function gironDe(chemin: readonly Point[], nb: number, virage: Escalier['virage'], l: number) {
  const coudes = virage === 'palier' ? chemin.length - 2 : 0;
  const utile = longueurChemin(chemin) - coudes * l;
  return Math.min(400, Math.max(100, entier(utile / Math.max(1, nb - coudes))));
}

/** Escalier tracé, sans l'enregistrer (aperçu pendant le tracé) ; `null` s'il est trop court. */
export function brouillonEscalier(
  chemin: readonly Point[],
  hauteurAMonter: number,
  reglages: Partial<Pick<Escalier, 'largeur' | 'virage' | 'limon' | 'structure'>> = {},
): Escalier | null {
  if (chemin.length < 2 || longueurChemin(chemin) < LONGUEUR_MIN) return null;
  const o = chemin[0]!;
  const local = chemin.map((p) => ({ x: entier(p.x - o.x), y: entier(p.y - o.y) }));
  const largeur = reglages.largeur ?? 900;
  const virage = reglages.virage ?? 'balance';
  const { nbMarches } = calculerMarches(hauteurAMonter, 'droit');
  const r = schemaEscalier.safeParse({
    id: 'esc_brouillon',
    type: 'droit',
    position: { x: entier(o.x), y: entier(o.y) },
    largeur,
    hauteurAMonter,
    nbMarches,
    giron: gironDe(local, nbMarches, virage, largeur),
    chemin: local,
    virage,
    ...(reglages.limon ? { limon: reglages.limon } : {}),
    ...(reglages.structure ? { structure: reglages.structure } : {}),
  });
  return r.success ? r.data : null;
}

/** Pose un escalier tracé : `chemin` sur le plan (mm), du départ à l'arrivée. */
export function poserEscalierTrace(
  n: Niveau,
  e: {
    chemin: readonly Point[];
    hauteurAMonter: number;
    largeur?: number;
    virage?: Escalier['virage'];
    limon?: Escalier['limon'];
    structure?: Escalier['structure'];
    materiau?: Escalier['materiau'];
  },
  ctx: Contexte,
): Resultat<Niveau> {
  const { chemin, hauteurAMonter, materiau, ...reglages } = e;
  const b = brouillonEscalier(chemin, hauteurAMonter, reglages);
  if (!b) return echec('PRECONDITION', { message: 'Tracez au moins 1 m d’escalier.' });
  const pose = { ...b, id: ctx.nouvelId('esc'), ...(materiau ? { materiau } : {}) };
  return succes({ ...n, escaliers: [...n.escaliers, pose] });
}

/** Déplace un point du tracé (poignée sur le plan) ; le giron suit la nouvelle longueur. */
export function deplacerPointEscalier(
  n: Niveau,
  id: string,
  i: number,
  vers: Point,
): Resultat<Niveau> {
  const e = n.escaliers.find((x) => x.id === id);
  if (!e?.chemin || i < 0 || i >= e.chemin.length) return echec('INTROUVABLE');
  const a = -radians(e.rotation);
  const [dx, dy] = [vers.x - e.position.x, vers.y - e.position.y];
  const local = {
    x: entier(dx * Math.cos(a) - dy * Math.sin(a)),
    y: entier(dx * Math.sin(a) + dy * Math.cos(a)),
  };
  const chemin = e.chemin.map((p, j) => (j === i ? local : p));
  if (longueurChemin(chemin) < LONGUEUR_MIN)
    return echec('PRECONDITION', { message: 'Escalier trop court.' });
  const suite = {
    ...e,
    chemin,
    giron: gironDe(chemin, e.nbMarches, e.virage, e.largeur),
  };
  return succes({ ...n, escaliers: n.escaliers.map((x) => (x.id === id ? suite : x)) });
}

/** Recalcule le giron d'un escalier tracé (largeur, virage ou hauteur changés). */
export const gironEscalierTrace = (e: Escalier, nbMarches = e.nbMarches) =>
  e.chemin ? gironDe(e.chemin, nbMarches, e.virage, e.largeur) : e.giron;
