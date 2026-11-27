import type { Mur, Niveau, Point, Scene } from '../schemas/dessinScene';
import { couvertureEtage, murPlein, sousToit } from './ailesToit';
import { centroide, pointDansPolygone } from './geometrie';
import { niveauSuperieur } from './niveaux';
import { contoursRaccordes } from './raccords';
import { toit3D } from './toits3d';
import { altitudeToit, versLocal, type Point3 } from './toitures';

/**
 * Contrôles des toits pour les tests (non exportés par le paquet) : toute maison, quelle que
 * soit sa forme, doit avoir un toit sans trou, sans pan plié, sans mur qui dépasse, sans vide
 * sous le toit, avec des acrotères sur les murs et un monopente d'un seul tenant.
 */

/** Le point (p, z) est-il dans ce mur vertical (à `marge` mm près de son plan) ? */
function fermePar(m: Point3[], p: Point, z: number, marge: number): boolean {
  const o = m[0]!;
  const b = m.find((q) => Math.hypot(q.x - o.x, q.y - o.y) > 1);
  if (!b) return false;
  const l = Math.hypot(b.x - o.x, b.y - o.y);
  const u = { x: (b.x - o.x) / l, y: (b.y - o.y) / l };
  if (Math.abs((p.x - o.x) * u.y - (p.y - o.y) * u.x) > marge) return false;
  const s = (q: Point) => (q.x - o.x) * u.x + (q.y - o.y) * u.y;
  return pointDansPolygone(
    { x: s(p), y: z },
    m.map((q) => ({ x: s(q), y: q.z })),
  );
}

/**
 * Murs du toit : aucun ne dépasse au-dessus du toit, et sur le pourtour de la maison, tout vide
 * entre le haut des murs et le toit est fermé par un mur (pas de pignon vide).
 */
function defautsMurs(
  n: Niveau,
  t: NonNullable<ReturnType<typeof toit3D>>,
  haut: Point[][],
): string[] {
  const toiture = n.toiture!;
  const out: string[] = [];
  const base = Math.min(...t.ailes.map((e) => e.base));
  const toitEn = (p: Point) => altitudeToit(toiture, t.ailes, p)?.z ?? null;
  const verticaux = t.murs.filter((m) => m.some((p) => Math.abs(p.z - m[0]!.z) > 1));
  if (toiture.type !== 'plate')
    for (const m of verticaux)
      for (const sommet of m) {
        // Mesuré un rien vers l'intérieur du mur : un sommet pile au bord d'une partie du toit.
        const cx = m.reduce((x, q) => x + q.x, 0) / m.length;
        const cy = m.reduce((y, q) => y + q.y, 0) / m.length;
        const v = {
          x: sommet.x + (cx - sommet.x) * 0.01,
          y: sommet.y + (cy - sommet.y) * 0.01,
          z: sommet.z,
        };
        // Toit le plus haut au sommet ou juste à côté (un sommet pile sur une marche du toit).
        // … et de part et d'autre de la face (3 mm) : le toit qui repose sur ce mur.
        const o = m[0]!;
        const b = m.find((q) => Math.hypot(q.x - o.x, q.y - o.y) > 1) ?? o;
        const lm = Math.hypot(b.x - o.x, b.y - o.y) || 1;
        const n3 = { x: (-(b.y - o.y) / lm) * 3, y: ((b.x - o.x) / lm) * 3 };
        const hauteurs = [
          sommet,
          v,
          { x: sommet.x + n3.x, y: sommet.y + n3.y },
          { x: sommet.x - n3.x, y: sommet.y - n3.y },
        ]
          .map(toitEn)
          .filter((x): x is number => x !== null);
        const z = hauteurs.length ? Math.max(...hauteurs) : null;
        // Sous l'étage, un mur est caché dans son volume.
        if (haut.some((poly) => pointDansPolygone(v, poly))) continue;
        if (v.z > base + 30 && (z === null || v.z > z + 30)) {
          out.push(
            `mur qui dépasse de ${z === null ? 'hors toit' : Math.round(v.z - z) + ' mm'} en ${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.z)} (${m.length} pts)`,
          );
          break;
        }
      }
  // Pourtour : face extérieure des murs, du haut des murs jusqu'au toit.
  const couvertes = sousToit(n.pieces);
  const autresMurs = (mur: Mur) => n.murs.filter((x) => x !== mur).map(murPlein);
  for (const mur of n.murs.filter((x) => x.type === 'mur')) {
    const l = Math.hypot(mur.b.x - mur.a.x, mur.b.y - mur.a.y);
    const nrm = { x: -(mur.b.y - mur.a.y) / l, y: (mur.b.x - mur.a.x) / l };
    for (const cote of [1, -1]) {
      for (const k of [0.23, 0.51, 0.77]) {
        const axe = { x: mur.a.x + (mur.b.x - mur.a.x) * k, y: mur.a.y + (mur.b.y - mur.a.y) * k };
        const a = (d: number) => ({ x: axe.x + nrm.x * cote * d, y: axe.y + nrm.y * cote * d });
        // Face extérieure ici : juste devant, ni pièce couverte ni autre mur (murs doublés).
        const devantIci = a(mur.epaisseur / 2 + 30);
        if (couvertes.some((x) => pointDansPolygone(devantIci, x.contour))) continue;
        if (autresMurs(mur).some((poly) => pointDansPolygone(devantIci, poly))) continue;
        const p = a(mur.epaisseur / 2 - 2);
        // Sous l'étage, c'est son plancher et ses murs qui ferment.
        if (haut.some((poly) => pointDansPolygone(p, poly))) continue;
        const z = toitEn(p);
        if (z === null || z - base < 100) continue;
        const zm = (base + z) / 2;
        const ferme = verticaux.some((m) => {
          const [o, b] = [m[0]!, m.find((q) => Math.hypot(q.x - m[0]!.x, q.y - m[0]!.y) > 1)];
          if (!b) return false;
          const lm = Math.hypot(b.x - o.x, b.y - o.y);
          const u = { x: (b.x - o.x) / lm, y: (b.y - o.y) / lm };
          if (Math.abs((p.x - o.x) * u.y - (p.y - o.y) * u.x) > 250) return false;
          const s = (q: Point) => (q.x - o.x) * u.x + (q.y - o.y) * u.y;
          return pointDansPolygone(
            { x: s(p), y: zm },
            m.map((q) => ({ x: s(q), y: q.z })),
          );
        });
        if (!ferme) {
          out.push(
            `vide sous le toit (${Math.round(z - base)} mm) en ${Math.round(p.x)},${Math.round(p.y)}`,
          );
          break;
        }
      }
    }
  }
  // Intérieur : là où une aile s'arrête au-dessus du toit d'une autre (ou du haut des murs),
  // une joue ferme le vide. Exact : l'aile continue-t-elle au-delà du bord ?
  const maison = [...couvertes.map((x) => x.contour), ...n.murs.map(murPlein)];
  t.pans.forEach((pan, pi) => {
    const propre = t.ailes[t.aileDesPans[pi]!]!;
    const autres = t.ailes.filter((e) => e !== propre);
    pan.forEach((a, i) => {
      const b = pan[(i + 1) % pan.length]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (l < 300) return;
      const nrm = { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
      for (const k of [0.27, 0.53, 0.79]) {
        const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
        const z = a.z + (b.z - a.z) * k;
        const sens = pointDansPolygone({ x: p.x + nrm.x * 30, y: p.y + nrm.y * 30 }, pan) ? -1 : 1;
        const ici = (d: number) => ({ x: p.x + nrm.x * sens * d, y: p.y + nrm.y * sens * d });
        const loc = versLocal(propre, ici(5));
        const continue_ =
          loc.a > propre.aMin + 1 &&
          loc.a < propre.aMax - 1 &&
          loc.b > propre.bMin + 1 &&
          loc.b < propre.bMax - 1;
        if (continue_) continue;
        if (!maison.some((q) => pointDansPolygone(ici(40), q))) continue;
        if (haut.some((q) => pointDansPolygone(ici(40), q))) continue;
        const dessous = Math.max(base, altitudeToit(toiture, autres, p)?.z ?? base);
        if (z - dessous < 100) continue;
        if (!verticaux.some((m) => fermePar(m, p, (z + dessous) / 2, 60)))
          out.push(`vide entre deux parties du toit en ${Math.round(p.x)},${Math.round(p.y)}`);
      }
    });
  });
  return out.map((x) => `${n.id} : ${x}`);
}

/** Défauts d'un toit : trous sur le dessus de la maison, pans pliés, valeurs absurdes. */
export function defautsToit(s: Scene): string[] {
  const out: string[] = [];
  for (const n of s.niveaux) {
    const dessus = niveauSuperieur(s, n.id);
    const t = n.toiture ? toit3D(n, dessus) : null;
    // Vrai contour des murs (angles raccordés), pas la pointe prolongée d'un angle aigu.
    const polys = [
      ...sousToit(n.pieces).map((p) => p.contour),
      ...contoursRaccordes(n.murs).values(),
    ];
    const haut = dessus ? couvertureEtage(dessus) : [];
    const xs = polys.flat().map((p) => p.x);
    const ys = polys.flat().map((p) => p.y);
    let trous = 0;
    let ex = '';
    for (let x = Math.min(...xs) + 37; x < Math.max(...xs); x += 150)
      for (let y = Math.min(...ys) + 61; y < Math.max(...ys); y += 150) {
        const p: Point = { x, y };
        if (
          !polys.some((q) => pointDansPolygone(p, q)) ||
          haut.some((q) => pointDansPolygone(p, q))
        )
          continue;
        // Couvert à 3 mm près (arrondis au bord d'une partie ou de l'étage : invisible).
        const autour = [
          p,
          ...[0, 1, 2, 3].map((k) => ({ x: p.x + [3, -3, 0, 0][k]!, y: p.y + [0, 0, 3, -3][k]! })),
        ];
        if (
          !autour.some((q) =>
            t?.pans.some((pan) =>
              pointDansPolygone(
                q,
                pan.map((r) => ({ x: r.x, y: r.y })),
              ),
            ),
          ) &&
          !autour.some((q) => haut.some((h) => pointDansPolygone(q, h)))
        ) {
          trous++;
          ex ||= `${x},${y}`;
        }
      }
    if (trous) out.push(`${n.id} : ${trous} points sans toit (ex. ${ex})`);
    // Un patio reste à ciel ouvert : aucun pan au-dessus de son centre.
    for (const patio of n.pieces.filter((p) => p.type === 'patio')) {
      const c = centroide(patio.contour);
      if (
        t?.pans.some((pan) =>
          pointDansPolygone(
            c,
            pan.map((q) => ({ x: q.x, y: q.y })),
          ),
        )
      )
        out.push(`${n.id} : toit sur le patio`);
    }
    if (!t) continue;
    out.push(...defautsMurs(n, t, haut));
    // Toit plat : chaque acrotère est posé sur un mur (jamais entre deux parties du toit).
    if (n.toiture?.type === 'plate') {
      const murs = [...contoursRaccordes(n.murs).values()];
      // Dessus des acrotères (faces horizontales) : au-dessus d'un mur.
      for (const m of t.murs.filter((m) => m.every((p) => Math.abs(p.z - m[0]!.z) < 1))) {
        const c = {
          x: m.reduce((x, p) => x + p.x, 0) / m.length,
          y: m.reduce((y, p) => y + p.y, 0) / m.length,
        };
        if (!murs.some((poly) => pointDansPolygone(c, poly)))
          out.push(`${n.id} : acrotère hors des murs`);
      }
    }
    // Monopente sans étage : une seule pente continue (tous les pans dans le même plan).
    if (n.toiture?.type === 'monopente' && !dessus && t.pans.length > 1) {
      const z = (p: Point3) => p.z;
      const ref = t.pans[0]!;
      const f = (p: Point3) => {
        // Plan du premier pan évalué en p (moindres écarts : trois premiers points).
        const [a, b, c] = ref;
        const det = (b!.x - a!.x) * (c!.y - a!.y) - (c!.x - a!.x) * (b!.y - a!.y);
        if (!det) return z(p);
        const ka = ((p.x - a!.x) * (c!.y - a!.y) - (c!.x - a!.x) * (p.y - a!.y)) / det;
        const kb = ((b!.x - a!.x) * (p.y - a!.y) - (p.x - a!.x) * (b!.y - a!.y)) / det;
        return a!.z + ka * (b!.z - a!.z) + kb * (c!.z - a!.z);
      };
      const ecart = Math.max(...t.pans.flat().map((p) => Math.abs(f(p) - p.z)));
      if (ecart > 5)
        out.push(`${n.id} : monopente en plusieurs rampes (écart ${Math.round(ecart)} mm)`);
    }
    const z = t.pans.flat().map((p) => p.z);
    if (!z.every(Number.isFinite)) out.push(`${n.id} : NaN`);
    if (t.faitage < t.egout) out.push(`${n.id} : faîtage sous l'égout`);
    for (const pan of t.pans) {
      // Normale de Newell (robuste aux sommets doublés et aux arêtes minuscules).
      const nrm = { x: 0, y: 0, z: 0 };
      pan.forEach((p, k) => {
        const q = pan[(k + 1) % pan.length]!;
        nrm.x += (p.y - q.y) * (p.z + q.z);
        nrm.y += (p.z - q.z) * (p.x + q.x);
        nrm.z += (p.x - q.x) * (p.y + q.y);
      });
      const l = Math.hypot(nrm.x, nrm.y, nrm.z);
      // Pan minuscule (moins de 0,05 m²) : invisible, ignoré.
      if (l / 2 < 50_000) continue;
      const a = pan[0]!;
      const ecart = Math.max(
        ...pan.map((q) =>
          Math.abs(((q.x - a.x) * nrm.x + (q.y - a.y) * nrm.y + (q.z - a.z) * nrm.z) / l),
        ),
      );
      if (ecart > 5) out.push(`${n.id} : pan plié de ${Math.round(ecart)} mm`);
    }
  }
  return out;
}
