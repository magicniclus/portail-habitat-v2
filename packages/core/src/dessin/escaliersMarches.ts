import type { Point } from '../schemas/dessinScene';
import type { Escalier } from './escaliers';
import { empriseChemin, limitesMarchesChemin } from './escaliersChemin';

/**
 * Forme exacte des marches d'un escalier tracé (DES-15, DES-33) : l'emprise découpée entre deux
 * traits de marche successifs. Une marche balancée est un trapèze, un palier garde son angle
 * extérieur : rien ne déborde de l'emprise, rien ne se chevauche.
 */

type Abscisse = { s: number; p: Point };

/** Point de la ligne brisée le plus proche de `q`, et sa distance depuis le début. */
function projeter(chaine: readonly Point[], q: Point): Abscisse & { d: number } {
  let mieux = { s: 0, p: chaine[0]!, d: Infinity };
  let s = 0;
  for (let i = 0; i < chaine.length - 1; i++) {
    const [a, b] = [chaine[i]!, chaine[i + 1]!];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const t = l
      ? Math.max(0, Math.min(1, ((q.x - a.x) * (b.x - a.x) + (q.y - a.y) * (b.y - a.y)) / l ** 2))
      : 0;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < mieux.d) mieux = { s: s + t * l, p, d };
    s += l;
  }
  return mieux;
}

/** Morceau de la ligne brisée entre deux abscisses (sommets intermédiaires compris). */
function entre(chaine: readonly Point[], de: Abscisse, a: Abscisse): Point[] {
  const out = [de.p];
  let s = 0;
  for (let i = 0; i < chaine.length - 1; i++) {
    const [p, q] = [chaine[i]!, chaine[i + 1]!];
    s += Math.hypot(q.x - p.x, q.y - p.y);
    if (s > de.s + 1 && s < a.s - 1) out.push(q);
  }
  out.push(a.p);
  return out;
}

const longueur = (c: readonly Point[]) =>
  c.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - c[i]!.x, p.y - c[i]!.y), 0);

/** Marches (et paliers) vues de dessus, dans le repère de l'escalier, de bas en haut. */
export function formesMarches(e: Escalier): Point[][] {
  const emprise = empriseChemin(e);
  const moitie = emprise.length / 2;
  const [A, B] = [emprise.slice(0, moitie), emprise.slice(moitie).reverse()];
  const coupes = limitesMarchesChemin(e)
    .map(([p, q]) => {
      const [pa, qa] = [projeter(A, p), projeter(A, q)];
      return pa.d <= qa.d ? { a: pa, b: projeter(B, q) } : { a: qa, b: projeter(B, p) };
    })
    .sort((x, y) => x.a.s - y.a.s);
  const bornes = [
    { a: { s: 0, p: A[0]! }, b: { s: 0, p: B[0]! } },
    ...coupes,
    { a: { s: longueur(A), p: A.at(-1)! }, b: { s: longueur(B), p: B.at(-1)! } },
  ];
  return bornes
    .slice(1)
    .map((fin, i) => [
      ...entre(A, bornes[i]!.a, fin.a),
      ...entre(B, bornes[i]!.b, fin.b).reverse(),
    ]);
}
