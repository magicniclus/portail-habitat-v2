import { describe, expect, it } from 'vitest';
import { contexteTest, ok } from './aidesTest';
import { definirParcelle } from './exterieur';
import { nouvelleScene } from './migrations';
import { revetementDuTerrain, revetirTerrain } from './terrain';

const ctx = contexteTest();

describe('sol du terrain (DES-19)', () => {
  it('gazon par défaut dans la parcelle ; revêtu de ce qu’on veut ; rien sans parcelle', () => {
    const vide = nouvelleScene(ctx.nouvelId);
    expect(revetementDuTerrain(vide)).toBeNull();
    expect(revetirTerrain(vide, { famille: 'gravier' }).ok).toBe(false);
    const s = ok(definirParcelle(vide, { x: 0, y: 0 }, { x: 20_000, y: 15_000 }));
    expect(revetementDuTerrain(s)).toEqual({ famille: 'gazon' });
    const pave = { famille: 'dalle' as const, format: { l: 200, p: 100 } };
    expect(revetementDuTerrain(ok(revetirTerrain(s, pave)))).toEqual(pave);
  });
});
