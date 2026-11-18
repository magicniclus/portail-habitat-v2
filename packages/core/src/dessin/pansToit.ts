import {
  ACROTERE,
  BRISIS,
  hauteurLocale,
  versMonde,
  type Emprise,
  type Point3,
  type Toiture,
} from './toitures';

export type Loc = [number, number];

/**
 * Pans d'une aile en coordonnées locales (a, b), avant élévation. Une croupe ou un quatre
 * pans n'ont de pente de bout qu'aux bouts libres ; contre une autre aile, le faîtage file.
 */
export function pansLocaux(t: Toiture, e: Emprise): Loc[][] {
  const { aMin: A0, aMax: A1, bMin: B0, bMax: B1 } = e;
  switch (e.type) {
    case 'monopente':
    case 'plate':
      return [
        [
          [A0, B0],
          [A1, B0],
          [A1, B1],
          [A0, B1],
        ],
      ];
    case 'mansarde': {
      const bb = e.P0 / 2 - e.P0 * BRISIS.part;
      return [
        [
          [A0, B0],
          [A1, B0],
          [A1, -bb],
          [A0, -bb],
        ],
        [
          [A0, -bb],
          [A1, -bb],
          [A1, 0],
          [A0, 0],
        ],
        [
          [A0, B1],
          [A1, B1],
          [A1, bb],
          [A0, bb],
        ],
        [
          [A0, bb],
          [A1, bb],
          [A1, 0],
          [A0, 0],
        ],
      ];
    }
    case 'deux_pans':
      return [
        [
          [A0, B0],
          [A1, B0],
          [A1, 0],
          [A0, 0],
        ],
        [
          [A0, B1],
          [A1, B1],
          [A1, 0],
          [A0, 0],
        ],
      ];
    case 'quatre_pans':
    case 'croupe': {
      // Bout du faîtage : en retrait aux bouts libres (croupe), au bord contre une autre aile.
      const recul = t.type === 'croupe' ? e.P0 / 4 : e.P0 / 2;
      const libre0 = e.cotes.a0 === 'exterieur';
      const libre1 = e.cotes.a1 === 'exterieur';
      const r0 = libre0 ? Math.min(0, -e.L0 / 2 + recul) : A0;
      const r1 = libre1 ? Math.max(0, e.L0 / 2 - recul) : A1;
      const pans: Loc[][] = [
        [
          [A0, B0],
          [A1, B0],
          [r1, 0],
          [r0, 0],
        ],
        [
          [A1, B1],
          [A0, B1],
          [r0, 0],
          [r1, 0],
        ],
      ];
      if (libre1)
        pans.push([
          [A1, B0],
          [A1, B1],
          [r1, 0],
        ]);
      if (libre0)
        pans.push([
          [A0, B1],
          [A0, B0],
          [r0, 0],
        ]);
      return pans;
    }
  }
}

/** Bords d'égout (gouttières) d'une aile, côtés extérieurs seulement. */
export function egoutsLocaux(e: Emprise): Loc[][] {
  const { aMin: A0, aMax: A1, bMin: B0, bMax: B1 } = e;
  const ext = (c: keyof Emprise['cotes']) => e.cotes[c] === 'exterieur';
  const bords: Loc[][] = [];
  if (e.type === 'plate') return bords;
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

/** Murs sous le toit : pignons aux bouts libres, mur haut d'un appentis, acrotères. */
export function mursLocaux(t: Toiture, e: Emprise): Point3[][] {
  const [L0, P0] = [e.L0 / 2, e.P0 / 2];
  const z = (a: number, b: number) => hauteurLocale(t, e, a, b);
  const ext = (c: keyof Emprise['cotes']) => e.cotes[c] === 'exterieur';
  if (e.type === 'plate') {
    const bords: [Loc, Loc, keyof Emprise['cotes']][] = [
      [[-L0, -P0], [L0, -P0], 'b0'],
      [[L0, -P0], [L0, P0], 'a1'],
      [[L0, P0], [-L0, P0], 'b1'],
      [[-L0, P0], [-L0, -P0], 'a0'],
    ];
    return bords
      .filter(([, , c]) => ext(c))
      .map(([p, q]) => [
        versMonde(e, p[0], p[1], 0),
        versMonde(e, q[0], q[1], 0),
        versMonde(e, q[0], q[1], ACROTERE),
        versMonde(e, p[0], p[1], ACROTERE),
      ]);
  }
  if (e.type === 'quatre_pans' || e.type === 'croupe') return [];
  const bs =
    e.type === 'mansarde'
      ? [-P0, -P0 + e.P0 * BRISIS.part, 0, P0 - e.P0 * BRISIS.part, P0]
      : e.type === 'monopente'
        ? [-P0, P0]
        : [-P0, 0, P0];
  const coupe = (a: number) => [
    versMonde(e, a, P0, 0),
    versMonde(e, a, -P0, 0),
    ...bs.map((b) => versMonde(e, a, b, z(a, b))),
  ];
  const murs: Point3[][] = [];
  if (ext('a0')) murs.push(coupe(-L0));
  if (ext('a1')) murs.push(coupe(L0));
  // Mur haut d'une monopente, sauf contre l'étage (l'appentis s'y adosse).
  const haut = e.sens === 1 ? P0 : -P0;
  if (e.type === 'monopente' && ext(e.sens === 1 ? 'b1' : 'b0'))
    murs.push([
      versMonde(e, -L0, haut, 0),
      versMonde(e, L0, haut, 0),
      versMonde(e, L0, haut, z(L0, haut)),
      versMonde(e, -L0, haut, z(-L0, haut)),
    ]);
  return murs;
}
