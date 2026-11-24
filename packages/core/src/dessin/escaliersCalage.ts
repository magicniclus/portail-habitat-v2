import { echec, succes, type Resultat } from '../resultat';
import type { Niveau, Point } from '../schemas/dessinScene';
import { murPlein } from './ailesToit';
import { emprise } from './escaliers';
import { aireSignee, centroide } from './geometrie';

/**
 * Escalier aimanté aux murs (DES-15) : posé ou tiré près d'un mur, il vient se caler contre sa
 * face (puis contre un second mur d'équerre : coin de pièce). Au-delà de `tolerance`, rien ne
 * bouge. Alt (côté éditeur) le pose librement.
 */

type Calage = { d: Point; normale: Point };

/** Faces des murs : segments avec leur normale tournée vers l'extérieur du mur. */
function faces(n: Niveau) {
  return n.murs
    .filter((m) => m.type !== 'separation' && m.type !== 'poutre')
    .flatMap((m) => {
      const poly = murPlein(m);
      const sens = aireSignee(poly) > 0 ? 1 : -1;
      return poly.map((a, i) => {
        const b = poly[(i + 1) % poly.length]!;
        const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const u = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
        return { a, l, u, normale: { x: u.y * sens, y: -u.x * sens } };
      });
    });
}

/** Plus petit déplacement qui colle l'emprise contre une face proche (d'équerre à `sauf`). */
function meilleurCalage(n: Niveau, pts: Point[], tolerance: number, sauf?: Point): Calage | null {
  const c = centroide(pts);
  let mieux: Calage | null = null;
  for (const f of faces(n)) {
    if (sauf && Math.abs(f.normale.x * sauf.x + f.normale.y * sauf.y) > 0.1) continue;
    // L'escalier est du côté extérieur de cette face (dans la pièce, pas dans le mur).
    if ((c.x - f.a.x) * f.normale.x + (c.y - f.a.y) * f.normale.y <= 0) continue;
    // Une arête de l'escalier parallèle à la face (à 2° près).
    const parallele = pts.some((p, i) => {
      const q = pts[(i + 1) % pts.length]!;
      const l = Math.hypot(q.x - p.x, q.y - p.y);
      return Math.abs((q.x - p.x) * f.u.y - (q.y - p.y) * f.u.x) < 0.035 * l;
    });
    if (!parallele) continue;
    const proches = pts
      .filter((p) => {
        const t = (p.x - f.a.x) * f.u.x + (p.y - f.a.y) * f.u.y;
        return t >= -1 && t <= f.l + 1;
      })
      .map((p) => (p.x - f.a.x) * f.normale.x + (p.y - f.a.y) * f.normale.y);
    if (!proches.length) continue;
    const ecart = Math.min(...proches);
    if (Math.abs(ecart) > tolerance) continue;
    const d = { x: -f.normale.x * ecart, y: -f.normale.y * ecart };
    if (!mieux || Math.hypot(d.x, d.y) < Math.hypot(mieux.d.x, mieux.d.y))
      mieux = { d, normale: f.normale };
  }
  return mieux;
}

/** Place l'escalier à `position`, calé contre les murs proches (un, puis un second d'équerre). */
export function placerEscalierContreMur(
  n: Niveau,
  id: string,
  position: Point,
  tolerance: number,
): Resultat<Niveau> {
  const e = n.escaliers.find((x) => x.id === id);
  if (!e) return echec('INTROUVABLE');
  let p = position;
  let sauf: Point | undefined;
  for (let k = 0; k < 2; k++) {
    const c = meilleurCalage(n, emprise({ ...e, position: p }), tolerance, sauf);
    if (!c) break;
    p = { x: p.x + c.d.x, y: p.y + c.d.y };
    sauf = c.normale;
  }
  const arrondi = { x: Math.round(p.x), y: Math.round(p.y) };
  return succes({
    ...n,
    escaliers: n.escaliers.map((x) => (x.id === id ? { ...x, position: arrondi } : x)),
  });
}
