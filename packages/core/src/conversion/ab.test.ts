import { describe, expect, it } from 'vitest';
import { gagnantAB } from './ab';

describe('bascule des tests A/B (CONVERSION §5)', () => {
  it('écart significatif à 95 % sur le taux de clic : la meilleure variante gagne', () => {
    expect(
      gagnantAB([
        { variante: 'A', envois: 500, clics: 40 },
        { variante: 'B', envois: 500, clics: 70 },
      ]),
    ).toBe('B');
  });
  it('écart non significatif, ou moins de 200 envois par variante : on continue', () => {
    expect(
      gagnantAB([
        { variante: 'A', envois: 500, clics: 40 },
        { variante: 'B', envois: 500, clics: 48 },
      ]),
    ).toBeNull();
    expect(
      gagnantAB([
        { variante: 'A', envois: 150, clics: 5 },
        { variante: 'B', envois: 150, clics: 40 },
      ]),
    ).toBeNull();
    expect(gagnantAB([{ variante: 'A', envois: 900, clics: 90 }])).toBeNull();
  });
});
