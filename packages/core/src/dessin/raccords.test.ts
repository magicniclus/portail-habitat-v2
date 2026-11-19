import { describe, expect, it } from 'vitest';
import type { Mur } from '../schemas/dessinScene';
import { contourMur } from './murs';
import { contoursRaccordes } from './raccords';

const mur = (id: string, a: [number, number], b: [number, number], epaisseur = 200): Mur =>
  ({
    id,
    type: 'mur',
    a: { x: a[0], y: a[1] },
    b: { x: b[0], y: b[1] },
    epaisseur,
    hauteur: 2500,
    alignement: 'axe',
  }) as Mur;
const arrondi = (ps: { x: number; y: number }[]) =>
  ps.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));

describe('jonctions des murs en onglet', () => {
  it('angle droit : les faces se rejoignent exactement, sans encoche ni débord', () => {
    const [h, v] = [mur('h', [0, 0], [4000, 0]), mur('v', [4000, 0], [4000, 3000])];
    const c = contoursRaccordes([h, v]);
    // Mur horizontal : coin extérieur à (4100, -100), coin intérieur à (3900, 100).
    expect(arrondi(c.get('h')!)).toEqual([
      { x: 0, y: 100 },
      { x: 3900, y: 100 },
      { x: 4100, y: -100 },
      { x: 0, y: -100 },
    ]);
    expect(arrondi(c.get('v')!)).toEqual([
      { x: 3900, y: 100 },
      { x: 3900, y: 3000 },
      { x: 4100, y: 3000 },
      { x: 4100, y: -100 },
    ]);
  });

  it('quel que soit le sens de tracé et pour des épaisseurs différentes', () => {
    const [h, v] = [mur('h', [4000, 0], [0, 0]), mur('v', [4000, 3000], [4000, 0], 100)];
    const c = contoursRaccordes([h, v]);
    const tous = [...c.values()].flatMap(arrondi);
    expect(tous).toContainEqual({ x: 4050, y: -100 });
    expect(tous).toContainEqual({ x: 3950, y: 100 });
  });

  it('jonction en T, en X, murs alignés ou angle trop aigu : rectangle conservé', () => {
    const t = [
      mur('h', [0, 0], [4000, 0]),
      mur('v', [2000, 0], [2000, 3000]),
      mur('w', [2000, 0], [2000, -3000]),
    ];
    const ct = contoursRaccordes(t);
    for (const m of t) expect(ct.get(m.id)).toEqual(contourMur(m));
    const alignes = [mur('a', [0, 0], [1000, 0]), mur('b', [1000, 0], [2000, 0])];
    expect(contoursRaccordes(alignes).get('a')).toEqual(contourMur(alignes[0]!));
    const aigu = [mur('a', [0, 0], [4000, 0]), mur('b', [4000, 0], [0, 100])];
    expect(contoursRaccordes(aigu).get('a')).toEqual(contourMur(aigu[0]!));
    // 15° : l'onglet ferait une pointe de plus de trois épaisseurs.
    const pointe = [mur('a', [0, 0], [4000, 0]), mur('b', [4000, 0], [136, 1035])];
    expect(contoursRaccordes(pointe).get('a')).toEqual(contourMur(pointe[0]!));
  });

  it('séparations et poutres ne se raccordent pas', () => {
    const s = { ...mur('s', [4000, 0], [4000, 3000]), type: 'separation' } as Mur;
    const h = mur('h', [0, 0], [4000, 0]);
    expect(contoursRaccordes([h, s]).get('h')).toEqual(contourMur(h));
  });
});
