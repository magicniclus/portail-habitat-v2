import { aire } from '@ph/core/dessin';
import { describe, expect, it } from 'vitest';
import { sceneDepuisChoix } from './scenesDepart';

const cotes = { largeur: 10_600, profondeur: 8_600, decoupeL: 4_000, decoupeP: 3_000 };

describe('scène de départ d’un nouveau plan (DES-01)', () => {
  it('plan vide : un rez-de-chaussée sans mur', () => {
    const r = sceneDepuisChoix('vide', cotes);
    expect(r.ok && r.scene.niveaux[0]!.murs).toEqual([]);
  });

  it('rectangle et formes : murs de 20 cm, pièce détectée', () => {
    const r = sceneDepuisChoix('rectangle', cotes);
    if (!r.ok) throw new Error(r.message);
    const n = r.scene.niveaux[0]!;
    expect(n.murs).toHaveLength(4);
    expect(aire(n.pieces[0]!.contour)).toBe(10_200 * 8_200);
    for (const forme of ['L', 'U', 'T'] as const) {
      const f = sceneDepuisChoix(forme, { ...cotes, decoupeL: 2_000 });
      expect(f.ok && f.scene.niveaux[0]!.pieces).toHaveLength(1);
    }
  });

  it('cotes impossibles : message clair', () => {
    expect(sceneDepuisChoix('rectangle', { ...cotes, largeur: 500 })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/petites/),
    });
  });
});
