import { describe, expect, it } from 'vitest';
import { apercuPlan, TAILLE_APERCU } from './apercu';
import { contexteTest, niveauMaquette } from './aidesTest';
import { nouvelleScene } from './migrations';

const ctx = contexteTest();

describe('aperçu de Mes plans (DES-02)', () => {
  it('contours des murs dans un carré de 100, coordonnées entières', () => {
    const d = apercuPlan({ niveaux: [niveauMaquette(ctx)] });
    expect(d).toMatch(/^M\d+ \d+L/);
    const nombres = d.match(/\d+/g)!.map(Number);
    expect(Math.max(...nombres)).toBeLessThanOrEqual(TAILLE_APERCU);
    expect(Math.min(...nombres)).toBeGreaterThanOrEqual(0);
  });

  it('vide sans mur ; tronqué aux murs entiers au-delà de 4 000 caractères', () => {
    expect(apercuPlan(nouvelleScene(ctx.nouvelId))).toBe('');
    const n = niveauMaquette(ctx);
    const murs = Array.from({ length: 400 }, (_, i) => ({
      ...n.murs[0]!,
      id: `m_${String(i).padStart(6, '0')}`,
      a: { x: i * 100, y: 0 },
      b: { x: i * 100, y: 5_000 },
    }));
    const d = apercuPlan({ niveaux: [{ ...n, murs }] });
    expect(d.length).toBeLessThanOrEqual(4_000);
    expect(d.endsWith('Z')).toBe(true);
  });
});
