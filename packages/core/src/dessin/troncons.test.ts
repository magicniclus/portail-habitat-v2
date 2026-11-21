import { describe, expect, it } from 'vitest';
import type { Mur } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { panDeMur, revetirPan } from './troncons';

const ctx = contexteTest();
// Maquette : mur du haut de (150, 150) à (10 450, 150), intérieur côté y > 150 (face a).
const base = niveauMaquette(ctx);
const fond = base.murs[0]!;
const cloison: Mur = {
  ...fond,
  id: 'm_cloison',
  a: { x: 4150, y: 150 },
  b: { x: 4150, y: 8450 },
  epaisseur: 100,
};
const n = { ...base, murs: [...base.murs, cloison] };
const sauge = { famille: 'peinture' as const, couleur: '#b5c4b1' };

describe('pans de mur (DES-25)', () => {
  it('la cloison découpe la face intérieure du mur du fond, pas la face extérieure', () => {
    expect(panDeMur(n, fond.id, 'a', 1000)).toEqual({ coupe: [0, 4000], visible: [0, 3950] });
    expect(panDeMur(n, fond.id, 'a', 6000)).toEqual({
      coupe: [4000, 10_300],
      visible: [4050, 10_300],
    });
    expect(panDeMur(n, fond.id, 'b', 6000)).toEqual({ coupe: [0, 10_300], visible: [0, 10_300] });
    expect(panDeMur(n, 'm_absent', 'a', 0)).toBeNull();
  });

  it('peindre un pan : le mur est coupé à la cloison, seul le pan visé change', () => {
    const r = ok(revetirPan(n, { murId: fond.id, face: 'a', s: 6000, revetement: sauge }, ctx));
    const peint = r.murs.find((m) => m.id === r.murId)!;
    expect(peint.faceA).toEqual(sauge);
    expect(peint.a).toEqual({ x: 4150, y: 150 });
    const reste = r.murs.find((m) => m.id === fond.id)!;
    expect(reste.b).toEqual({ x: 4150, y: 150 });
    expect(reste.faceA).not.toEqual(sauge);
    // Pan entre deux cloisons : deux coupes, le morceau du milieu seul est peint.
    const deux = {
      ...n,
      murs: [...n.murs, { ...cloison, id: 'm_cloison2', a: { x: 7150, y: 150 } }],
    };
    const r2 = ok(revetirPan(deux, { murId: fond.id, face: 'a', s: 5500, revetement: sauge }, ctx));
    const milieu = r2.murs.find((m) => m.id === r2.murId)!;
    expect([milieu.a.x, milieu.b.x]).toEqual([4150, 7150]);
    // Sans cloison : tout le mur, sans coupe.
    const seul = ok(
      revetirPan(base, { murId: fond.id, face: 'a', s: 100, revetement: sauge }, ctx),
    );
    expect(seul.murs).toHaveLength(base.murs.length);
    expect(
      revetirPan(base, { murId: 'm_absent', face: 'a', s: 0, revetement: sauge }, ctx).ok,
    ).toBe(false);
  });
});
