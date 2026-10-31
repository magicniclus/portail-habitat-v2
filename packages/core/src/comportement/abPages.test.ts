import { describe, expect, it } from 'vitest';
import { evaluerTestPage, varianteSession } from './abPages';

describe('varianteSession', () => {
  const v = [
    { id: 'A', poids: 0.5 },
    { id: 'B', poids: 0.5 },
  ];
  it('donne toujours la même variante à une session', () => {
    expect(varianteSession('abc123', v)).toBe(varianteSession('abc123', v));
  });

  it('répartit selon les poids', () => {
    const ids = Array.from({ length: 2000 }, (_, i) => `session-${i}`);
    const b = ids.filter((id) => varianteSession(id, v) === 'B').length / ids.length;
    expect(b).toBeGreaterThan(0.45);
    expect(b).toBeLessThan(0.55);
    expect(
      ids.every(
        (id) =>
          varianteSession(id, [
            { id: 'A', poids: 1 },
            { id: 'B', poids: 0 },
          ]) === 'A',
      ),
    ).toBe(true);
  });

  it('se rabat sur la dernière variante si les poids sont nuls', () => {
    expect(
      varianteSession('x', [
        { id: 'A', poids: 0 },
        { id: 'B', poids: 0 },
      ]),
    ).toBe('B');
  });
});

describe('evaluerTestPage', () => {
  it('propose une variante nettement meilleure, sans l’appliquer', () => {
    const r = evaluerTestPage([
      { id: 'A', sessions: 2000, conversions: 100 },
      { id: 'B', sessions: 2000, conversions: 150 },
    ]);
    expect(r.probabilites.B).toBeGreaterThan(0.99);
    expect(r.gains.B).toBeCloseTo(0.5, 1);
    expect(r.proposee).toBe('B');
  });

  it('ne propose rien quand l’écart n’est pas sûr', () => {
    const r = evaluerTestPage([
      { id: 'A', sessions: 2000, conversions: 100 },
      { id: 'B', sessions: 2000, conversions: 105 },
    ]);
    expect(r.probabilites.B).toBeGreaterThan(0.5);
    expect(r.probabilites.B).toBeLessThan(0.95);
    expect(r.proposee).toBeNull();
  });

  it('attend au moins 100 sessions par variante', () => {
    expect(
      evaluerTestPage([
        { id: 'A', sessions: 50, conversions: 0 },
        { id: 'B', sessions: 50, conversions: 25 },
      ]).proposee,
    ).toBeNull();
  });

  it('donne une probabilité faible à une variante moins bonne', () => {
    const r = evaluerTestPage([
      { id: 'A', sessions: 2000, conversions: 150 },
      { id: 'B', sessions: 2000, conversions: 100 },
    ]);
    expect(r.probabilites.B).toBeLessThan(0.01);
  });

  it('gère une liste vide', () => {
    expect(evaluerTestPage([])).toEqual({ probabilites: {}, gains: {}, proposee: null });
  });
});
