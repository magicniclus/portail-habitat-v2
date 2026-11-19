import { describe, expect, it } from 'vitest';
import { pansVisibles } from './decoupeToit';
import { aire3D } from './toitures';

const carre = (x0: number, y0: number, c: number, z: (x: number, y: number) => number) =>
  [
    [x0, y0],
    [x0 + c, y0],
    [x0 + c, y0 + c],
    [x0, y0 + c],
  ].map(([x, y]) => ({ x: x!, y: y!, z: z(x!, y!) }));

describe('réunion des toits des ailes (DES-16)', () => {
  it('un pan plus bas perd la partie couverte par un pan plus haut', () => {
    const bas = carre(0, 0, 1000, () => 0);
    const haut = carre(500, 0, 1000, () => 100);
    const [a, b] = [pansVisibles([[bas], [haut]]), pansVisibles([[haut], [bas]])];
    const surface = (l: typeof a) => l.reduce((s, p) => s + aire3D(p), 0);
    // 1 m² (haut) + 0,5 m² visibles du pan bas, dans les deux ordres.
    expect(surface(a)).toBeCloseTo(1_500_000, -2);
    expect(surface(b)).toBeCloseTo(1_500_000, -2);
  });

  it('pans qui se croisent : chacun garde sa partie au-dessus ; pan vertical gardé ; caché en entier', () => {
    const monte = carre(0, 0, 1000, (x) => x);
    const descend = carre(0, 0, 1000, (x) => 1000 - x);
    const v = pansVisibles([[monte], [descend]]);
    // Chacun garde la moitié où il est le plus haut.
    expect(v.reduce((s, p) => s + aire3D(p), 0) / 1e6).toBeCloseTo(2 * 0.5 * Math.SQRT2, 2);
    const mur = [
      { x: 0, y: 0, z: 0 },
      { x: 1000, y: 0, z: 0 },
      { x: 1000, y: 0, z: 500 },
    ];
    expect(pansVisibles([[mur], [monte]])).toContainEqual(mur);
    expect(
      pansVisibles([[carre(100, 100, 200, () => 0)], [carre(0, 0, 1000, () => 50)]]),
    ).toHaveLength(1);
    // Un pan dégénéré (points alignés) est gardé tel quel.
    const ligne = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ];
    expect(pansVisibles([[ligne], []])).toEqual([ligne]);
  });
});
