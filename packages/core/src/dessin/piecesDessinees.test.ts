import { describe, expect, it } from 'vitest';
import { niveau as schemaNiveau } from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { aire } from './geometrie';
import { pieceDepuisContour, pieceRectangle } from './piecesDessinees';

const ctx = contexteTest();
const vide = () => schemaNiveau.parse({ id: 'n_rdc0', nom: 'RDC', type: 'rdc', altitude: 0 });

describe('pièce dessinée d’un geste (DES-12)', () => {
  it('rectangle : quatre murs, une pièce ; coins alignés refusés', () => {
    const n = ok(pieceRectangle(vide(), { x: 0, y: 0 }, { x: 4_000, y: 3_000 }, ctx));
    expect([n.murs.length, n.pieces.length]).toEqual([4, 1]);
    expect(pieceRectangle(vide(), { x: 0, y: 0 }, { x: 0, y: 3_000 }, ctx)).toMatchObject({
      ok: false,
    });
  });

  it('polygone : pentagone en L, point de fermeture répété ignoré', () => {
    const l = [
      { x: 0, y: 0 },
      { x: 6_000, y: 0 },
      { x: 6_000, y: 3_000 },
      { x: 3_000, y: 3_000 },
      { x: 3_000, y: 5_000 },
      { x: 0, y: 5_000 },
      { x: 0, y: 0 },
    ];
    const n = ok(pieceDepuisContour(vide(), l, ctx));
    expect(n.murs).toHaveLength(6);
    expect(n.pieces).toHaveLength(1);
    expect(Math.abs(aire(n.pieces[0]!.contour))).toBeGreaterThan(20_000_000);
  });

  it('refus lisibles : trop peu de points, côté minuscule, trop petit, croisé, trop de côtés', () => {
    const p = (x: number, y: number) => ({ x, y });
    const refus = (pts: { x: number; y: number }[]) => pieceDepuisContour(vide(), pts, ctx);
    expect(refus([p(0, 0), p(1_000, 0)])).toMatchObject({ message: /trois points/ });
    expect(refus([p(0, 0), p(1_000, 0), p(1_000, 50), p(0, 1_000)])).toMatchObject({
      message: /10 cm/,
    });
    expect(refus([p(0, 0), p(400, 0), p(0, 400)])).toMatchObject({ message: /petite/ });
    expect(refus([p(0, 0), p(2_000, 2_000), p(2_000, 0), p(0, 2_000)])).toMatchObject({
      message: /croise/,
    });
    const cercle = Array.from({ length: 70 }, (_, i) =>
      p(Math.round(5_000 * Math.cos(i / 11)), Math.round(5_000 * Math.sin(i / 11))),
    );
    expect(refus(cercle)).toMatchObject({ message: /64/ });
  });
});
