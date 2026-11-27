import { plansAile, type Emprise, type PlanToit, type Toiture } from './toitures';

export type Loc = [number, number];

/** Partie du polygone où f(a, b) ≤ 0 (f linéaire) : découpe de Sutherland–Hodgman. */
function garder(poly: Loc[], f: (p: Loc) => number): Loc[] {
  const out: Loc[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    const [fp, fq] = [f(p), f(q)];
    if (fp <= 0) out.push(p);
    if (fp < 0 !== fq < 0 && fp !== fq) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
}

const aire = (poly: Loc[]) =>
  Math.abs(
    poly.reduce((s, p, i) => {
      const q = poly[(i + 1) % poly.length]!;
      return s + p[0] * q[1] - q[0] * p[1];
    }, 0),
  ) / 2;

/**
 * Pans d'une aile en coordonnées locales (a, b), avant élévation : pour chaque versant, la zone
 * de l'aile (débords compris) où son plan est le plus bas (`plansAile`). Arêtiers, faîtages et
 * noues tombent d'eux-mêmes à leur place, quels que soient les débords ou les côtés contre une
 * autre aile ; chaque pan est plan.
 */
export function pansLocaux(t: Toiture, e: Emprise): Loc[][] {
  const plans = plansAile(t, e);
  const rect: Loc[] = [
    [e.aMin, e.bMin],
    [e.aMax, e.bMin],
    [e.aMax, e.bMax],
    [e.aMin, e.bMax],
  ];
  const memes = (p: PlanToit, q: PlanToit) =>
    Math.abs(p.ca - q.ca) < 1e-9 && Math.abs(p.cb - q.cb) < 1e-9 && Math.abs(p.c0 - q.c0) < 1e-6;
  return plans.flatMap((p, i) => {
    let poly = rect;
    for (let j = 0; j < plans.length && poly.length >= 3; j++) {
      const q = plans[j]!;
      if (j === i) continue;
      // Deux versants confondus : le premier seul porte le pan.
      if (memes(p, q)) {
        if (j < i) poly = [];
        continue;
      }
      poly = garder(poly, ([a, b]) => (p.ca - q.ca) * a + (p.cb - q.cb) * b + (p.c0 - q.c0));
    }
    return poly.length >= 3 && aire(poly) > 100 ? [poly] : [];
  });
}

/** Bords d'égout (gouttières) d'une aile, côtés extérieurs seulement. */
export function egoutsLocaux(e: Emprise): Loc[][] {
  const { aMin: A0, aMax: A1, bMin: B0, bMax: B1 } = e;
  const ext = (c: keyof Emprise['cotes']) => e.cotes[c] === 'exterieur';
  const bords: Loc[][] = [];
  if (e.type === 'plate') return bords;
  if (e.type === 'monopente' && e.pente) {
    // D'un seul tenant : gouttière sur le côté extérieur qui regarde vers le bas de la pente.
    const dl = {
      a: e.pente.d.x * e.u.x + e.pente.d.y * e.u.y,
      b: e.pente.d.x * e.v.x + e.pente.d.y * e.v.y,
    };
    const cotes: [keyof Emprise['cotes'], number, Loc[]][] = [
      [
        'b0',
        -dl.b,
        [
          [A0, B0],
          [A1, B0],
        ],
      ],
      [
        'b1',
        dl.b,
        [
          [A0, B1],
          [A1, B1],
        ],
      ],
      [
        'a0',
        -dl.a,
        [
          [A0, B1],
          [A0, B0],
        ],
      ],
      [
        'a1',
        dl.a,
        [
          [A1, B0],
          [A1, B1],
        ],
      ],
    ];
    return cotes.filter(([c, sens]) => ext(c) && sens < -0.5).map(([, , bord]) => bord);
  }
  if (e.type === 'monopente') {
    // Côté bas seulement : b- si le toit monte vers b+, sinon b+.
    if (e.sens === 1 ? ext('b0') : ext('b1'))
      bords.push(
        e.sens === 1
          ? [
              [A0, B0],
              [A1, B0],
            ]
          : [
              [A0, B1],
              [A1, B1],
            ],
      );
    return bords;
  }
  if (ext('b0'))
    bords.push([
      [A0, B0],
      [A1, B0],
    ]);
  if (ext('b1'))
    bords.push([
      [A0, B1],
      [A1, B1],
    ]);
  if (e.type === 'quatre_pans' || e.type === 'croupe') {
    if (ext('a1'))
      bords.push([
        [A1, B0],
        [A1, B1],
      ]);
    if (ext('a0'))
      bords.push([
        [A0, B1],
        [A0, B0],
      ]);
  }
  return bords;
}
