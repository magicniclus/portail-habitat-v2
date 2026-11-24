import { expect, it } from 'vitest';
import {
  niveau as schemaNiveau,
  type Mur,
  type Niveau,
  type Point,
  type Scene,
} from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { couvertureEtage, murPlein, sousToit } from './ailesToit';
import { toitureAutomatique } from './commandesToit';
import { pointDansPolygone } from './geometrie';
import { contoursRaccordes } from './raccords';
import { nouvelleScene } from './migrations';
import { niveauSuperieur } from './niveaux';
import { detecterPieces, synchroniserPieces } from './pieces';
import { toit3D } from './toits3d';
import { altitudeToit, type Point3, type TypeToiture } from './toitures';

const ctx = contexteTest();
/** Murs de 20 cm le long d'un contour fermé (axes des murs, mm). */
const contour = (pts: [number, number][], tourner = 0): Mur[] => {
  const r = (tourner * Math.PI) / 180;
  const p = pts.map(([x, y]) => ({
    x: Math.round(x * Math.cos(r) - y * Math.sin(r)),
    y: Math.round(x * Math.sin(r) + y * Math.cos(r)),
  }));
  return p.map((a, i) => ({
    id: ctx.nouvelId('m'),
    a,
    b: p[(i + 1) % p.length]!,
    type: 'mur' as const,
    epaisseur: 200,
    hauteur: 2_500,
    porteur: true,
  })) as Mur[];
};
const rect = (x0: number, y0: number, x1: number, y1: number, t = 0) =>
  contour(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    t,
  );
/** Pièce qui contient le centre du patio du O (6 m, 6 m) : marquée « patio ». */
const PATIO = { x: 6_000, y: 6_000 };
const niv = (id: string, type: 'rdc' | 'etage', altitude: number, murs: Mur[]) => ({
  ...schemaNiveau.parse({ id, nom: id, type, altitude }),
  murs,
  pieces: synchroniserPieces([], detecterPieces(murs), () => ctx.nouvelId('p')).map((p) =>
    murs.length === 16 && pointDansPolygone(PATIO, p.contour)
      ? { ...p, type: 'patio' as const }
      : p,
  ),
});

const FORMES: Record<string, () => Mur[]> = {
  L: () =>
    contour([
      [0, 0],
      [12_000, 0],
      [12_000, 4_000],
      [5_000, 4_000],
      [5_000, 10_000],
      [0, 10_000],
    ]),
  U: () =>
    contour([
      [0, 0],
      [4_000, 0],
      [4_000, 6_000],
      [8_000, 6_000],
      [8_000, 0],
      [12_000, 0],
      [12_000, 10_000],
      [0, 10_000],
    ]),
  T: () =>
    contour([
      [0, 0],
      [12_000, 0],
      [12_000, 4_000],
      [8_000, 4_000],
      [8_000, 10_000],
      [4_000, 10_000],
      [4_000, 4_000],
      [0, 4_000],
    ]),
  H: () =>
    contour([
      [0, 0],
      [4_000, 0],
      [4_000, 4_000],
      [8_000, 4_000],
      [8_000, 0],
      [12_000, 0],
      [12_000, 12_000],
      [8_000, 12_000],
      [8_000, 8_000],
      [4_000, 8_000],
      [4_000, 12_000],
      [0, 12_000],
    ]),
  Z: () =>
    contour([
      [0, 0],
      [8_000, 0],
      [8_000, 4_000],
      [12_000, 4_000],
      [12_000, 10_000],
      [4_000, 10_000],
      [4_000, 6_000],
      [0, 6_000],
    ]),
  croix: () =>
    contour([
      [4_000, 0],
      [8_000, 0],
      [8_000, 4_000],
      [12_000, 4_000],
      [12_000, 8_000],
      [8_000, 8_000],
      [8_000, 12_000],
      [4_000, 12_000],
      [4_000, 8_000],
      [0, 8_000],
      [0, 4_000],
      [4_000, 4_000],
    ]),
  escalier: () =>
    contour([
      [0, 0],
      [4_000, 0],
      [4_000, 3_000],
      [8_000, 3_000],
      [8_000, 6_000],
      [12_000, 6_000],
      [12_000, 10_000],
      [0, 10_000],
    ]),
  biais: () =>
    contour([
      [0, 0],
      [10_000, 0],
      [12_000, 7_000],
      [0, 7_000],
    ]),
  tournee: () => rect(0, 0, 11_000, 7_000, 30),
  'L tourné': () =>
    contour(
      [
        [0, 0],
        [12_000, 0],
        [12_000, 4_000],
        [5_000, 4_000],
        [5_000, 10_000],
        [0, 10_000],
      ],
      25,
    ),
  // O : quatre ailes autour d'un patio (le patio est fermé par les murs).
  O: () => [
    ...rect(0, 0, 12_000, 4_000),
    ...rect(0, 8_000, 12_000, 12_000),
    ...rect(0, 4_000, 4_000, 8_000),
    ...rect(8_000, 4_000, 12_000, 8_000),
  ],
};
/** Rotation de chaque forme (l'étage partiel tourne avec la maison). */
const ROTATION: Record<string, number> = { tournee: 30, 'L tourné': 25 };
const ETAGES: Record<string, (rdc: () => Mur[], nom: string) => Mur[] | null> = {
  'plain-pied': () => null,
  'étage complet': (f) => f(),
  'étage partiel': (_, nom) => rect(0, 0, 4_000, 4_000, ROTATION[nom] ?? 0),
};
const TYPES: TypeToiture[] = [
  'deux_pans',
  'quatre_pans',
  'croupe',
  'monopente',
  'plate',
  'mansarde',
];

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
        const z = toitEn(v);
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
  return out.map((x) => `${n.id} : ${x}`);
}

/** Défauts d'un toit : trous sur le dessus de la maison, pans pliés, valeurs absurdes. */
function defauts(s: Scene): string[] {
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
        if (
          !t?.pans.some((pan) =>
            pointDansPolygone(
              p,
              pan.map((q) => ({ x: q.x, y: q.y })),
            ),
          )
        ) {
          trous++;
          ex ||= `${x},${y}`;
        }
      }
    if (trous) out.push(`${n.id} : ${trous} points sans toit (ex. ${ex})`);
    // Le patio reste à ciel ouvert.
    if (
      n.pieces.some((p) => p.type === 'patio') &&
      t?.pans.some((pan) =>
        pointDansPolygone(
          PATIO,
          pan.map((q) => ({ x: q.x, y: q.y })),
        ),
      )
    )
      out.push(`${n.id} : toit sur le patio`);
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

it('toits sur des formes variées (L, U, T, H, Z, croix, escalier, biais, tournées, O)', () => {
  const tous: string[] = [];
  for (const [nom, f] of Object.entries(FORMES))
    for (const [etage, e] of Object.entries(ETAGES))
      for (const type of TYPES)
        for (const faitageAngle of [0, 900]) {
          const brute: Scene = {
            ...nouvelleScene(ctx.nouvelId),
            niveaux: [
              niv('n_rdc0', 'rdc', 0, f()),
              ...(e(f, nom) ? [niv('n_et01', 'etage', 2_700, e(f, nom)!)] : []),
            ],
          };
          let s = ok(toitureAutomatique(brute, type));
          s = {
            ...s,
            niveaux: s.niveaux.map((n) =>
              n.toiture ? { ...n, toiture: { ...n.toiture, faitageAngle } } : n,
            ),
          };
          tous.push(
            ...defauts(s).map(
              (d) => `${nom} · ${etage} · ${type}${faitageAngle ? ' tourné' : ''} · ${d}`,
            ),
          );
        }
  expect(tous).toEqual([]);
}, 120_000);
