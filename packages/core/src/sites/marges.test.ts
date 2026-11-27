import { describe, expect, it } from 'vitest';
import { margesDe, reglerMarge } from './marges';

describe('marges des contenus', () => {
  it('sans réglage : la marge du bas historique sur tous les appareils', () => {
    expect(margesDe({ mb: 16 }).mobile).toEqual({ h: 0, b: 16, g: 0, d: 0 });
  });

  it('ordinateur : tablette et mobile suivent sauf s’ils ont leur propre valeur', () => {
    const r1 = reglerMarge({ mb: 16 }, 'mobile', 'h', 8);
    expect(r1.marges.mobile.h).toBe(8);
    expect(r1.marges.desktop.h).toBe(0);
    const r2 = reglerMarge(r1, 'desktop', 'h', 24);
    expect([r2.marges.desktop.h, r2.marges.tablet.h, r2.marges.mobile.h]).toEqual([24, 24, 8]);
    const r3 = reglerMarge(r2, 'desktop', 'b', 40);
    expect(r3.mb).toBe(40);
    expect(r3.marges.mobile.b).toBe(40);
  });

  it('tablette : le mobile suit, l’ordinateur ne bouge pas', () => {
    const r = reglerMarge({ mb: 0 }, 'tablet', 'g', 12);
    expect([r.marges.desktop.g, r.marges.tablet.g, r.marges.mobile.g]).toEqual([0, 12, 12]);
  });
});
