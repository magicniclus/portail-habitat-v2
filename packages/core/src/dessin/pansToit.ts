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

/** Pans en coordonnées locales (a, b), avant élévation. */
export function pansLocaux(t: Toiture, e: Emprise): Loc[][] {
  const [L, P] = [e.L / 2, e.P / 2];
  switch (t.type) {
    case 'monopente':
    case 'plate':
      return [
        [
          [-L, -P],
          [L, -P],
          [L, P],
          [-L, P],
        ],
      ];
    case 'mansarde': {
      const bb = e.P0 / 2 - e.P0 * BRISIS.part;
      return [-1, 1].flatMap((s) => [
        [
          [-L, s * P],
          [L, s * P],
          [L, s * bb],
          [-L, s * bb],
        ] as Loc[],
        [
          [-L, s * bb],
          [L, s * bb],
          [L, 0],
          [-L, 0],
        ] as Loc[],
      ]);
    }
    case 'deux_pans':
      return [-1, 1].map((s) => [
        [-L, s * P],
        [L, s * P],
        [L, 0],
        [-L, 0],
      ]);
    case 'quatre_pans':
    case 'croupe': {
      // Faîtage le long de a (on suppose L ≥ P ; sinon le faîtage se réduit à un point).
      const r = Math.max(0, t.type === 'croupe' ? e.L0 / 2 - e.P0 / 4 : (e.L0 - e.P0) / 2);
      return [
        [
          [-L, -P],
          [L, -P],
          [r, 0],
          [-r, 0],
        ],
        [
          [L, P],
          [-L, P],
          [-r, 0],
          [r, 0],
        ],
        [
          [L, -P],
          [L, P],
          [r, 0],
        ],
        [
          [-L, P],
          [-L, -P],
          [-r, 0],
        ],
      ];
    }
  }
}

/** Murs sous le toit : pignons, mur haut de monopente, acrotères. */
export function mursLocaux(t: Toiture, e: Emprise): Point3[][] {
  const [L0, P0] = [e.L0 / 2, e.P0 / 2];
  const z = (a: number, b: number) => hauteurLocale(t, e, a, b);
  if (t.type === 'plate')
    return [
      [
        [-L0, -P0],
        [L0, -P0],
      ],
      [
        [L0, -P0],
        [L0, P0],
      ],
      [
        [L0, P0],
        [-L0, P0],
      ],
      [
        [-L0, P0],
        [-L0, -P0],
      ],
    ].map(([p, q]) => [
      versMonde(e, p![0]!, p![1]!, 0),
      versMonde(e, q![0]!, q![1]!, 0),
      versMonde(e, q![0]!, q![1]!, ACROTERE),
      versMonde(e, p![0]!, p![1]!, ACROTERE),
    ]);
  if (t.type === 'quatre_pans' || t.type === 'croupe') return [];
  const coupe = (a: number) => {
    const bs =
      t.type === 'mansarde'
        ? [-P0, -P0 + e.P0 * BRISIS.part, 0, P0 - e.P0 * BRISIS.part, P0]
        : t.type === 'monopente'
          ? [-P0, P0]
          : [-P0, 0, P0];
    return [
      versMonde(e, a, P0, 0),
      versMonde(e, a, -P0, 0),
      ...bs.map((b) => versMonde(e, a, b, z(a, b))),
    ];
  };
  const murs = [coupe(-L0), coupe(L0)];
  if (t.type === 'monopente')
    murs.push([
      versMonde(e, -L0, P0, 0),
      versMonde(e, L0, P0, 0),
      versMonde(e, L0, P0, z(L0, P0)),
      versMonde(e, -L0, P0, z(-L0, P0)),
    ]);
  return murs;
}
