import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { poserEscalier } from './escaliers';
import { placerEscalierContreMur } from './escaliersCalage';

describe('escalier aimanté aux murs (DES-15)', () => {
  const ctx = contexteTest();
  // Maison de la maquette : faces intérieures à x = 300 et y = 300.
  const n = ok(
    poserEscalier(
      niveauMaquette(ctx),
      { type: 'droit', position: { x: 2_000, y: 3_000 }, hauteurAMonter: 2_700 },
      ctx,
    ),
  );
  const id = n.escaliers[0]!.id;
  const ici = (x: number, y: number) =>
    ok(placerEscalierContreMur(n, id, { x, y }, 150)).escaliers[0]!.position;

  it('près d’un mur : se cale contre sa face', () => {
    expect(ici(380, 3_000)).toEqual({ x: 300, y: 3_000 });
    expect(ici(240, 3_000)).toEqual({ x: 300, y: 3_000 });
  });

  it('près d’un coin : se cale contre les deux murs ; loin : ne bouge pas', () => {
    expect(ici(360, 410)).toEqual({ x: 300, y: 300 });
    expect(ici(2_000, 3_000)).toEqual({ x: 2_000, y: 3_000 });
    expect(placerEscalierContreMur(n, 'esc_absent', { x: 0, y: 0 }, 150).ok).toBe(false);
  });

  it('tourné de biais : aucune arête parallèle au mur, il reste où on le pose', () => {
    const biais = { ...n, escaliers: n.escaliers.map((e) => ({ ...e, rotation: 450 })) };
    expect(
      ok(placerEscalierContreMur(biais, id, { x: 900, y: 3_000 }, 150)).escaliers[0]!.position,
    ).toEqual({
      x: 900,
      y: 3_000,
    });
  });
});
