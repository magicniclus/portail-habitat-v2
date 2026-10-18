import { describe, expect, it } from 'vitest';
import { simplifier } from './simplifier';

describe('simplifier', () => {
  it('garde un trajet déjà court tel quel', () => {
    expect(simplifier([0, 0, 10, 10], 40)).toEqual([0, 0, 10, 10]);
  });

  it('garde les extrémités et le coin le plus marqué', () => {
    // Ligne droite de (0,0) à (100,0) puis montée jusqu'à (100,100) : le coin est en (100,0).
    const pts: number[] = [];
    for (let x = 0; x <= 100; x += 10) pts.push(x, 0);
    for (let y = 10; y <= 100; y += 10) pts.push(100, y);
    expect(simplifier(pts, 3)).toEqual([0, 0, 100, 0, 100, 100]);
  });

  it('ne dépasse jamais le nombre de points demandé', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => (i % 2 ? Math.sin(i) * 300 : i));
    expect(simplifier(pts, 40)).toHaveLength(80);
  });

  it('accepte des points confondus', () => {
    expect(simplifier([5, 5, 5, 5, 5, 5, 5, 5], 3)).toHaveLength(6);
  });
});
