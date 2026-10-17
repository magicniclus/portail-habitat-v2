import { describe, expect, it } from 'vitest';
import { appliquerFeuilles, feuillesNumeriques, versionSuivante } from './referentiels';

const p = {
  tarif: { min: 2500, max: 3800, paliers: [{ seuil: 10, coef: 1.2 }] },
  tva: 'reduite',
  actif: true,
};

describe('référentiels (ADMIN §2.9)', () => {
  it('feuilles numériques : chemins à point, tableaux indexés, le reste ignoré', () => {
    expect(feuillesNumeriques(p)).toEqual([
      { chemin: 'tarif.min', valeur: 2500 },
      { chemin: 'tarif.max', valeur: 3800 },
      { chemin: 'tarif.paliers.0.seuil', valeur: 10 },
      { chemin: 'tarif.paliers.0.coef', valeur: 1.2 },
    ]);
  });
  it('appliquer : seulement des chemins existants, nombres finis et positifs ; original intact', () => {
    const r = appliquerFeuilles(p, { 'tarif.min': 2600, 'tarif.paliers.0.coef': 1.3 });
    expect(r.tarif.min).toBe(2600);
    expect(r.tarif.paliers[0]!.coef).toBe(1.3);
    expect(p.tarif.min).toBe(2500);
    expect(() => appliquerFeuilles(p, { 'tarif.inconnu': 1 })).toThrow(/tarif.inconnu/);
    expect(() => appliquerFeuilles(p, { tva: 1 })).toThrow(/tva/);
    expect(() => appliquerFeuilles(p, { 'tarif.min': -1 })).toThrow(/positif/);
  });
  it('version suivante : date du jour et compteur', () => {
    expect(versionSuivante('2026-09-12.3', '2026-10-04')).toBe('2026-10-04.1');
    expect(versionSuivante('2026-10-04.3', '2026-10-04')).toBe('2026-10-04.4');
    expect(versionSuivante('v1', '2026-10-04')).toBe('2026-10-04.1');
  });
});
