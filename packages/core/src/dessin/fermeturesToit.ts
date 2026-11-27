import type { Niveau, Point } from '../schemas/dessinScene';
import { couvertureEtage, murPlein, sousToit } from './ailesToit';
import { intersectionSegments, pointDansPolygone } from './geometrie';
import { altitudeToit, versLocal, type Emprise, type Point3, type Toiture } from './toitures';

/** Pas d'échantillonnage le long d'un bord (mm) et vide toléré sous le toit (mm). */
const PAS = 200;
const JEU = 20;

/**
 * Murs sous le toit (DES-16), déduits de la seule surface du toit, quelle que soit sa forme
 * (deux pans, croupe, mansarde, monopente, L, U, O, biais…) :
 * - sur le pourtour de la maison, chaque mur extérieur monte jusqu'au toit, en suivant ses
 *   cassures (faîtages, arêtiers) : pignons, bandes de surcroît, côtés d'un monopente ;
 * - à l'intérieur, là où un pan s'arrête au-dessus d'un toit plus bas (aile plus haute), une
 *   joue verticale descend de ce bord jusqu'au toit d'en dessous.
 * Aucun cas particulier par type de toit : jamais de pignon vide ni de mur qui dépasse.
 */
export function mursSousLeToit(
  n: Niveau,
  dessus: Niveau | null,
  t: Toiture,
  ailes: readonly Emprise[],
  visibles: readonly { pan: Point3[]; aile: number }[],
): Point3[][] {
  const pans = visibles.map((v) => v.pan);
  if (!ailes.length || t.type === 'plate') return [];
  const base = Math.min(...ailes.map((e) => e.base));
  const couvertes = sousToit(n.pieces);
  const haut = dessus ? couvertureEtage(dessus) : [];
  const murs = n.murs.filter((m) => m.type !== 'separation' && m.type !== 'poutre');
  const maison = [...couvertes.map((p) => p.contour), ...murs.map(murPlein)];
  const dans = (polys: readonly Point[][], p: Point) => polys.some((q) => pointDansPolygone(p, q));
  const toit = (p: Point) => altitudeToit(t, ailes, p)?.z ?? null;
  // Cassures à suivre : bords des pans, limites de la maison (murs, pièces) et de l'étage.
  const bords = (polys: readonly (readonly Point[])[]) =>
    polys.flatMap((p) => p.map((a, i) => [a, p[(i + 1) % p.length]!] as const));
  const aretes = [...bords(pans), ...bords(maison), ...bords(haut)];

  /** Abscisses à évaluer le long de [a, b] : pas régulier et croisements des bords du toit. */
  const abscisses = (a: Point, b: Point, decalages: readonly Point[] = []) => {
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    // Extrémités, et juste à l'intérieur : une cassure pile au bout d'un bord est suivie.
    const s = new Set<number>([0, l, ...(l > 4 ? [2, l - 2] : [])]);
    for (let k = PAS; k < l; k += PAS) s.add(k);
    // Lignes parallèles où l'on teste ce qu'il y a derrière : leurs croisements comptent aussi.
    for (const d of decalages)
      for (const [p, q] of aretes) {
        const i = intersectionSegments(
          { x: a.x + d.x, y: a.y + d.y },
          { x: b.x + d.x, y: b.y + d.y },
          p,
          q,
        );
        if (!i) continue;
        const k = Math.hypot(i.x - d.x - a.x, i.y - d.y - a.y);
        for (const v of [k - 2, k, k + 2]) if (v >= 0 && v <= l) s.add(v);
      }
    // De part et d'autre de chaque cassure croisée : le haut du mur suit une marche (bord d'une
    // aile plus haute) verticalement, et chaque fermeture va jusqu'au bout de la maison.
    for (const [p, q] of aretes) {
      const i = intersectionSegments(a, b, p, q);
      if (!i) continue;
      const k = Math.hypot(i.x - a.x, i.y - a.y);
      for (const v of [k - 2, k, k + 2]) if (v >= 0 && v <= l) s.add(v);
    }
    return [...s].sort((x, y) => x - y);
  };

  /** Mur vertical par morceaux continus : bas et haut donnés en chaque point (null : rien). */
  const morceaux = (pts: ({ p: Point; bas: number; haut: number } | null)[]) => {
    const out: Point3[][] = [];
    let run: { p: Point; bas: number; haut: number }[] = [];
    // Un morceau qui ne ferme rien (vide partout sous 2 cm) n'est pas gardé.
    const finir = () => {
      if (run.length >= 2 && run.some((h) => h.haut - h.bas >= JEU))
        out.push([
          ...run.map((h) => ({ ...h.p, z: h.bas })),
          ...[...run].reverse().map((h) => ({ ...h.p, z: h.haut })),
        ]);
      run = [];
    };
    for (const h of pts) {
      if (h) run.push(h);
      else finir();
    }
    finir();
    return out;
  };

  const out: Point3[][] = [];
  // 1. Pourtour : face extérieure de chaque mur, du haut des murs jusqu'au toit.
  for (const mur of murs.filter((m) => m.type === 'mur')) {
    const l = Math.hypot(mur.b.x - mur.a.x, mur.b.y - mur.a.y);
    if (l < 1) continue;
    const u = { x: (mur.b.x - mur.a.x) / l, y: (mur.b.y - mur.a.y) / l };
    const nrm = { x: -u.y, y: u.x };
    const autres = murs.filter((x) => x !== mur).map(murPlein);
    for (const cote of [1, -1]) {
      const d = mur.epaisseur / 2;
      // Face prolongée d'une demi-épaisseur : les fermetures se rejoignent aux angles.
      const ici = (s: number, dd: number) => ({
        x: mur.a.x + u.x * (s - d) + nrm.x * cote * dd,
        y: mur.a.y + u.y * (s - d) + nrm.y * cote * dd,
      });
      const [a, b] = [ici(0, d), ici(l + 2 * d, d)];
      out.push(
        ...morceaux(
          abscisses(a, b, [{ x: nrm.x * cote * 30, y: nrm.y * cote * 30 }]).map((s) => {
            const p = ici(s, d);
            const devant = ici(s, d + 30);
            if (
              dans(
                couvertes.map((x) => x.contour),
                devant,
              ) ||
              dans(autres, devant)
            )
              return null;
            if (dans(haut, p)) return null;
            // Toit mesuré 3 mm à l'intérieur de la face, au-dessus du mur : sans ambiguïté quand
            // le bord d'une partie du toit tombe pile sur la face (maison tournée, arrondis).
            const z = toit(ici(s, d - 3));
            // Vide nul compris : la fermeture part exactement d'où le vide commence.
            return z === null ? null : { p, bas: base, haut: Math.max(base, z) };
          }),
        ),
      );
    }
  }
  // 2. Intérieur : bord d'un pan où son aile s'arrête, au-dessus du toit des autres ailes (ou
  //    du haut des murs). Exact : l'aile continue-t-elle au-delà ? sinon, quel toit dessous ?
  for (const { pan, aile } of visibles) {
    const propre = ailes[aile]!;
    const autres = ailes.filter((_, j) => j !== aile);
    const continue_ = (p: Point) => {
      const l = versLocal(propre, p);
      return (
        l.a > propre.aMin + 1 &&
        l.a < propre.aMax - 1 &&
        l.b > propre.bMin + 1 &&
        l.b < propre.bMax - 1
      );
    };
    pan.forEach((a, i) => {
      const b = pan[(i + 1) % pan.length]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l < 50) return;
      const nrm = { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // Côté opposé au pan : là où le pan ne va pas.
      const dehors = pointDansPolygone({ x: m.x + nrm.x * 30, y: m.y + nrm.y * 30 }, pan) ? -1 : 1;
      const cote = (p: Point, dd: number) => ({
        x: p.x + nrm.x * dehors * dd,
        y: p.y + nrm.y * dehors * dd,
      });
      out.push(
        ...morceaux(
          abscisses(a, b, [cote({ x: 0, y: 0 }, 30)]).map((s) => {
            const k = s / l;
            const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
            const zHaut = a.z + (b.z - a.z) * k;
            const v = cote(p, 5);
            // L'aile continue (faîtage, arêtier, pli) ou rien de la maison dessous : rien.
            if (continue_(v) || !dans(maison, cote(p, 30)) || dans(haut, cote(p, 30))) return null;
            const zBas = Math.max(base, altitudeToit(t, autres, p)?.z ?? base);
            return { p, bas: Math.min(zBas, zHaut), haut: zHaut };
          }),
        ),
      );
    });
  }
  return out;
}
