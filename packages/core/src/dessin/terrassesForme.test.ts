import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import type { Niveau } from '../schemas/dessinScene';
import { ajouterTerrasse } from './exterieur';
import { aire } from './geometrie';
import { deplacerCoteTerrasse, deplacerSommetTerrasse } from './terrassesForme';

describe('terrasses : tracer large, retoucher (DES-18)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);

  it('un grand rectangle autour de la maison : la terrasse en fait le tour, sans la maison', () => {
    const r = ok(ajouterTerrasse(n, { x: -3_000, y: -3_000 }, { x: 13_600, y: 11_600 }, ctx));
    const ts = r.exterieur.terrasses;
    expect(ts).toHaveLength(4);
    const total = ts.reduce((s, t) => s + aire(t.contour), 0);
    // Rectangle tracé moins l'emprise de la maison (10,60 × 8,60 m, murs compris).
    const xs = n.murs.flatMap((m) => [m.a.x, m.b.x]);
    expect(total).toBeGreaterThan(16_600 * 14_600 - 11_000 * 9_000);
    expect(total).toBeLessThan(16_600 * 14_600 - 10_000 * 8_000);
    expect(xs.length).toBeGreaterThan(0);
    // Aucun morceau ne touche l'intérieur de la maison.
    for (const t of ts) {
      const cx = t.contour.reduce((s, p) => s + p.x, 0) / 4;
      const cy = t.contour.reduce((s, p) => s + p.y, 0) / 4;
      expect(cx < 0 || cx > 10_600 || cy < 0 || cy > 8_600).toBe(true);
    }
  });

  it('coin tiré : le rectangle reste rectangle ; côté poussé : seuls ses deux sommets bougent', () => {
    let r: Niveau = ok(
      ajouterTerrasse(n, { x: 1_000, y: 9_100 }, { x: 6_000, y: 12_100 }, ctx, { aimant: false }),
    );
    const id = r.exterieur.terrasses[0]!.id;
    r = ok(deplacerSommetTerrasse(r, id, 2, { x: 7_000, y: 13_000 }));
    expect(r.exterieur.terrasses[0]!.contour).toEqual([
      { x: 1_000, y: 9_100 },
      { x: 7_000, y: 9_100 },
      { x: 7_000, y: 13_000 },
      { x: 1_000, y: 13_000 },
    ]);
    r = ok(deplacerCoteTerrasse(r, id, 1, { x: 8_000, y: 11_000 }));
    expect(r.exterieur.terrasses[0]!.contour[1]).toEqual({ x: 8_000, y: 9_100 });
    expect(r.exterieur.terrasses[0]!.contour[2]).toEqual({ x: 8_000, y: 13_000 });
    expect(deplacerSommetTerrasse(r, id, 2, { x: 1_100, y: 9_200 }).ok).toBe(false);
    expect(deplacerSommetTerrasse(r, 'te_absent', 0, { x: 0, y: 0 }).ok).toBe(false);
  });
});
