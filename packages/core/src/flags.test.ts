import { describe, expect, it } from 'vitest';
import { FLAGS, flag } from './flags';

describe('flag()', () => {
  it('valeur par défaut sans configuration', () => {
    expect(flag('appelsOffresPayants')).toBe(FLAGS.appelsOffresPayants.defaut);
    expect(flag('diagnosticCommunes')).toBe(true);
  });
  it('la valeur globale remplace le défaut', () => {
    expect(flag('appelsOffresPayants', { globales: { appelsOffresPayants: true } })).toBe(true);
  });
  it('la surcharge par artisan l’emporte (bêta-testeurs)', () => {
    const config = {
      globales: { appelsOffresPayants: false },
      parArtisan: { a1: { appelsOffresPayants: true } },
    };
    expect(flag('appelsOffresPayants', { ...config, artisanId: 'a1' })).toBe(true);
    expect(flag('appelsOffresPayants', { ...config, artisanId: 'a2' })).toBe(false);
  });
  it('chaque flag a une description et une date de retrait', () => {
    for (const f of Object.values(FLAGS)) {
      expect(f.description.length).toBeGreaterThan(5);
      expect(f.retraitPrevu).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});
