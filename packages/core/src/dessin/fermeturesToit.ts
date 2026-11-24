import type { Niveau, Point } from '../schemas/dessinScene';
import { couvertureEtage, murPlein, sousToit } from './ailesToit';
import { pointDansPolygone } from './geometrie';
import { altitudeToit, type Emprise, type Point3, type Toiture } from './toitures';

/** Pas d'échantillonnage le long des murs (mm) et vide toléré sous le toit (mm). */
const PAS = 200;
const JEU = 40;

/** Le point (p, z) est-il dans l'un des murs verticaux déjà dessinés sous le toit ? */
function dejaFerme(murs: readonly Point3[][], p: Point, z: number): boolean {
  return murs.some((m) => {
    const o = m[0]!;
    const b = m.find((q) => Math.hypot(q.x - o.x, q.y - o.y) > 1);
    if (!b) return false;
    const l = Math.hypot(b.x - o.x, b.y - o.y);
    const u = { x: (b.x - o.x) / l, y: (b.y - o.y) / l };
    if (Math.abs((p.x - o.x) * u.y - (p.y - o.y) * u.x) > 120) return false;
    const s = (q: Point) => (q.x - o.x) * u.x + (q.y - o.y) * u.y;
    return pointDansPolygone(
      { x: s(p), y: z },
      m.map((q) => ({ x: s(q), y: q.z })),
    );
  });
}

/**
 * Fermetures sous le toit (DES-16) : le long de chaque mur extérieur, là où le toit reste
 * au-dessus du haut du mur sans pignon ni bande pour fermer (mur en biais, angle rentrant…), le
 * mur monte jusqu'au toit. Jamais de vide entre les murs et le toit, quelle que soit la forme.
 */
export function fermeturesSousLeToit(
  n: Niveau,
  dessus: Niveau | null,
  t: Toiture,
  ailes: readonly Emprise[],
  murs: readonly Point3[][],
): Point3[][] {
  if (!ailes.length || t.type === 'plate') return [];
  const base = Math.min(...ailes.map((e) => e.base));
  const couvertes = sousToit(n.pieces);
  const haut = dessus ? couvertureEtage(dessus) : [];
  const verticaux = murs.filter((m) => m.some((p) => Math.abs(p.z - m[0]!.z) > 1));
  const out: Point3[][] = [];
  for (const mur of n.murs.filter((x) => x.type === 'mur')) {
    const l = Math.hypot(mur.b.x - mur.a.x, mur.b.y - mur.a.y);
    if (l < PAS) continue;
    const u = { x: (mur.b.x - mur.a.x) / l, y: (mur.b.y - mur.a.y) / l };
    const nrm = { x: -u.y, y: u.x };
    const autres = n.murs.filter((x) => x !== mur).map(murPlein);
    for (const cote of [1, -1]) {
      const ici = (s: number, d: number) => ({
        x: mur.a.x + u.x * s + nrm.x * cote * d,
        y: mur.a.y + u.y * s + nrm.y * cote * d,
      });
      const nb = Math.ceil(l / PAS);
      // Hauteur du toit à fermer en chaque point de la face extérieure (null : rien à fermer).
      const hauteurs = Array.from({ length: nb + 1 }, (_, k) => {
        const s = (k / nb) * l;
        const devant = ici(s, mur.epaisseur / 2 + 30);
        if (couvertes.some((x) => pointDansPolygone(devant, x.contour))) return null;
        if (autres.some((poly) => pointDansPolygone(devant, poly))) return null;
        const p = ici(s, mur.epaisseur / 2 - 1);
        if (haut.some((poly) => pointDansPolygone(p, poly))) return null;
        const z = altitudeToit(t, ailes, p)?.z;
        if (z === undefined || z - base < JEU || dejaFerme(verticaux, p, (base + z) / 2))
          return null;
        return { p, z: z - 5 };
      });
      // Morceaux continus à fermer : un mur du haut des murs jusque sous le toit.
      let morceau: { p: Point; z: number }[] = [];
      const finir = () => {
        if (morceau.length >= 2)
          out.push([
            ...morceau.map((h) => ({ ...h.p, z: base })),
            ...[...morceau].reverse().map((h) => ({ ...h.p, z: h.z })),
          ]);
        morceau = [];
      };
      for (const h of hauteurs) {
        if (h) morceau.push(h);
        else finir();
      }
      finir();
    }
  }
  return out;
}
