import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { centresChemin, empriseChemin, poserEscalierTrace } from './escaliersChemin';
import { formesMarches } from './escaliersMarches';
import { habillageEscalier } from './escaliersHabillage';
import { aire, pointDansPolygone } from './geometrie';

describe('marches d’un escalier tracé : forme exacte (DES-15, DES-33)', () => {
  const ctx = contexteTest();
  const tour = [
    { x: 2_000, y: 7_000 },
    { x: 2_000, y: 2_000 },
    { x: 6_000, y: 2_000 },
  ];
  for (const virage of ['balance', 'palier'] as const)
    it(`quart tournant ${virage} : une forme par marche, sans chevauchement, emprise remplie`, () => {
      const n = ok(
        poserEscalierTrace(
          niveauMaquette(ctx),
          { chemin: tour, hauteurAMonter: 2_700, virage },
          ctx,
        ),
      );
      const e = n.escaliers[0]!;
      const formes = formesMarches(e);
      const centres = centresChemin(e);
      expect(formes.length).toBeGreaterThanOrEqual(centres.length);
      const somme = formes.reduce((s, f) => s + Math.abs(aire(f)), 0);
      expect(somme).toBeCloseTo(Math.abs(aire(empriseChemin(e))), -4);
      // Chaque marche contient son centre.
      for (const c of centres) expect(formes.some((f) => pointDansPolygone(c.local, f))).toBe(true);
    });

  it('3D : marches à leur forme exacte, socle plein ou dessous ouvert', () => {
    const n = ok(
      poserEscalierTrace(niveauMaquette(ctx), { chemin: tour, hauteurAMonter: 2_700 }, ctx),
    );
    const e = n.escaliers[0]!;
    const plein = habillageEscalier(e, 0);
    expect(plein.filter((p) => p.empreinte && p.matiere === 'socle').length).toBeGreaterThan(5);
    const ouvert = habillageEscalier({ ...e, structure: 'ouverte' }, 0);
    expect(ouvert.some((p) => p.matiere === 'socle')).toBe(false);
    expect(ouvert.filter((p) => p.empreinte).length).toBe(centresChemin(e).length);
  });
});
