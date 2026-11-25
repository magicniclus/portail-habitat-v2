import type { Niveau, Point } from '../schemas/dessinScene';
import { distance } from './geometrie';
import type { Guide } from './placement';

/* Glisser un mur à la souris (DES-06) : d'équerre et aimanté aux alignements. */

interface OptionsGlissement {
  /** Rayon d'attraction en mm (déduit du zoom). */
  tolerance: number;
  /** Points d'accroche : extrémités des autres murs, du niveau et des niveaux voisins. */
  reperes?: readonly Point[];
  /** Alt : sans aimant (le mur relié reste d'équerre). */
  libre?: boolean;
}

const PAS = 10;
const scalaire = (p: Point, d: Point) => p.x * d.x + p.y * d.y;

/** Extrémités des autres murs du niveau (hors celles qui suivent le mur) et des niveaux voisins. */
export function reperesDuGlissement(
  n: Niveau,
  murId: string,
  voisins: readonly (Niveau | null)[] = [],
): Point[] {
  const m = n.murs.find((x) => x.id === murId);
  if (!m) return [];
  const bouge = (p: Point) => distance(p, m.a) <= 1 || distance(p, m.b) <= 1;
  const ici = n.murs.filter((x) => x.id !== murId).flatMap((x) => [x.a, x.b]);
  const ailleurs = voisins.flatMap((v) => v?.murs.flatMap((x) => [x.a, x.b]) ?? []);
  return [...ici.filter((p) => !bouge(p)), ...ailleurs];
}

/** Décalage le long de `d` (depuis `o`) calé sur le repère le plus proche, sinon au pas. */
function caler(o: Point, d: Point, v: number, options: OptionsGlissement) {
  if (!options.libre) {
    const q = (options.reperes ?? [])
      .map((p) => ({ p, v: scalaire({ x: p.x - o.x, y: p.y - o.y }, d) }))
      .filter((c) => Math.abs(c.v - v) <= options.tolerance)
      .sort((a, b) => Math.abs(a.v - v) - Math.abs(b.v - v))[0];
    if (q) return { v: q.v, repere: q.p };
  }
  return { v: options.libre ? Math.round(v) : Math.round(v / PAS) * PAS, repere: null };
}

/**
 * Décalage total d'un mur glissé depuis sa position de départ. Un mur relié à d'autres ne
 * bouge que perpendiculairement à lui-même : les murs voisins s'allongent sans se tordre.
 * Le décalage se cale sur l'alignement d'une extrémité de mur proche (même niveau ou niveau
 * du dessous, pour superposer un étage au rez-de-chaussée), avec un guide pour le montrer.
 */
export function viserGlissementMur(
  n: Niveau,
  murId: string,
  depart: { a: Point; b: Point },
  delta: Point,
  options: OptionsGlissement,
): { delta: Point; guides: Guide[] } {
  const m = n.murs.find((x) => x.id === murId);
  const l = distance(depart.a, depart.b);
  if (!m || l === 0) return { delta, guides: [] };
  const u = { x: (depart.b.x - depart.a.x) / l, y: (depart.b.y - depart.a.y) / l };
  const nrm = { x: -u.y, y: u.x };
  const relie = n.murs.some(
    (x) => x.id !== murId && [x.a, x.b].some((p) => distance(p, m.a) <= 1 || distance(p, m.b) <= 1),
  );
  const cn = caler(depart.a, nrm, scalaire(delta, nrm), options);
  const ct = relie ? { v: 0, repere: null } : caler(depart.a, u, scalaire(delta, u), options);
  const total = {
    x: Math.round(nrm.x * cn.v + u.x * ct.v),
    y: Math.round(nrm.y * cn.v + u.y * ct.v),
  };
  const a = { x: depart.a.x + total.x, y: depart.a.y + total.y };
  const guides: Guide[] = [];
  // Guide : du repère jusqu'à la ligne du mur (ou jusqu'à sa perpendiculaire, le long du mur).
  if (cn.repere) {
    const s = Math.min(l, Math.max(0, scalaire({ x: cn.repere.x - a.x, y: cn.repere.y - a.y }, u)));
    guides.push({
      a: cn.repere,
      b: { x: Math.round(a.x + u.x * s), y: Math.round(a.y + u.y * s) },
    });
  }
  if (ct.repere) {
    const s = scalaire({ x: ct.repere.x - a.x, y: ct.repere.y - a.y }, nrm);
    guides.push({
      a: ct.repere,
      b: { x: Math.round(a.x + nrm.x * s), y: Math.round(a.y + nrm.y * s) },
    });
  }
  return { delta: total, guides };
}
