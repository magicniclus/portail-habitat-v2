import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { poserEscalier, type TypeEscalier } from './escaliers';
import { habillageEscalier } from './escaliersHabillage';

const ctx = contexteTest();
const n = niveauMaquette(ctx);
const escalier = (type: TypeEscalier) =>
  ok(poserEscalier(n, { type, position: { x: 1000, y: 1000 }, hauteurAMonter: 2_700 }, ctx))
    .escaliers[0]!;
const de = (p: ReturnType<typeof habillageEscalier>, m: string) => p.filter((x) => x.matiere === m);

describe('escalier dessiné comme en menuiserie (DES-15)', () => {
  it('plein : marches à nez posées sur un socle, garde-corps', () => {
    const e = escalier('droit');
    const p = habillageEscalier(e, 0);
    const marches = de(p, 'marche');
    expect(marches).toHaveLength(e.nbMarches);
    // Marche mince (bois 4 cm), dessus à la hauteur de la marche ; nez de 3 cm.
    expect(marches[0]!.taille.h).toBe(40);
    expect(marches.at(-1)!.centre.z + 20).toBeCloseTo(2_700, 0);
    expect(de(p, 'socle')).toHaveLength(e.nbMarches);
    expect(de(p, 'limon')).toHaveLength(0);
    // Poteaux et main courante inclinée.
    const rampe = de(p, 'rampe');
    expect(rampe.some((r) => r.pente > 0.3)).toBe(true);
    expect(rampe.filter((r) => r.pente === 0).length).toBeGreaterThan(3);
  });

  it('ouvert : limons latéraux (bois), limon central (métal), paillasse (béton) ; pas de socle', () => {
    const e = { ...escalier('quart_bas'), structure: 'ouverte' as const };
    const bois = habillageEscalier(e, 0);
    expect(de(bois, 'socle')).toHaveLength(0);
    expect(de(bois, 'limon')).toHaveLength(2 * e.nbMarches);
    const metal = habillageEscalier({ ...e, materiau: 'metal' }, 0);
    expect(de(metal, 'limon')).toHaveLength(e.nbMarches);
    expect(de(metal, 'marche')[0]!.taille.h).toBe(30);
    const beton = habillageEscalier({ ...e, materiau: 'beton' }, 1_000);
    const [paillasse] = de(beton, 'limon');
    expect(paillasse!.taille.p).toBe(e.largeur);
    expect(de(beton, 'marche')[0]!.centre.z).toBeGreaterThan(1_000);
  });

  it('colimaçon : fût central du sol à l’arrivée', () => {
    const p = habillageEscalier(escalier('helicoidal'), 0);
    const [fut] = de(p, 'limon');
    expect(fut!.taille.h).toBe(2_700);
  });
});
