import { describe, expect, it } from 'vitest';
import { nouvelleScene } from './migrations';
import {
  ajouterSommetParcelle,
  deplacerParcelle,
  deplacerSommetParcelle,
  supprimerParcelle,
} from './parcelle';
import { definirParcelle } from './exterieur';
import { contexteTest, ok } from './aidesTest';

const ctx = contexteTest();
const scene = ok(
  definirParcelle(nouvelleScene(ctx.nouvelId), { x: 0, y: 0 }, { x: 20_000, y: 15_000 }),
);
const coins = (s: typeof scene) => s.terrain!.parcelle;

describe('parcelle retouchée après la pose (DES-19)', () => {
  it('un coin se tire, la parcelle se déplace, un angle s’ajoute sur un côté', () => {
    const i = coins(scene).findIndex((p) => p.x === 20_000 && p.y === 15_000);
    let s = ok(deplacerSommetParcelle(scene, i, { x: 24_000.4, y: 18_000 }));
    expect(coins(s)[i]).toEqual({ x: 24_000, y: 18_000 });
    s = ok(deplacerParcelle(s, { x: 1_000, y: -500 }));
    expect(coins(s)[i]).toEqual({ x: 25_000, y: 17_500 });
    s = ok(ajouterSommetParcelle(s, 0, { x: 5_000, y: 7_000 }));
    expect(coins(s)).toHaveLength(5);
    expect(coins(s)[1]).toEqual({ x: 5_000, y: 7_000 });
  });

  it('refuse une parcelle écrasée, un coin absent ; se supprime', () => {
    expect(deplacerSommetParcelle(scene, 9, { x: 0, y: 0 }).ok).toBe(false);
    const [a, b] = coins(scene);
    // Tous les coins ramenés sur une ligne : plus de surface.
    let s = ok(deplacerSommetParcelle(scene, 2, { x: b!.x, y: b!.y }));
    expect(deplacerSommetParcelle(s, 3, { x: a!.x, y: a!.y }).ok).toBe(false);
    s = ok(supprimerParcelle(scene));
    expect(s.terrain).toBeNull();
    expect(deplacerParcelle(s, { x: 1, y: 1 }).ok).toBe(false);
    expect(ajouterSommetParcelle(s, 0, { x: 1, y: 1 }).ok).toBe(false);
  });
});
