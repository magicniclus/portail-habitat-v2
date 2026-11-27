import { describe, expect, it } from 'vitest';
import type { Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { murPlein } from './ailesToit';
import { ajouterMur } from './commandes';
import { modifierMur } from './commandesMurs';
import { pointDansPolygone } from './geometrie';
import { pieceRectangle } from './piecesDessinees';
import { dallesDuNiveau } from './volumes';

/** Points de la zone ni sous un sol ni sous un mur : là, on verrait l'herbe. */
function aDecouvert(n: Niveau, zones: number[][]) {
  const pleins = [...dallesDuNiveau(n).sols.map((d) => d.contour), ...n.murs.map(murPlein)];
  const vides: string[] = [];
  for (const [x0, y0, x1, y1] of zones)
    for (let x = x0!; x <= x1!; x += 25)
      for (let y = y0!; y <= y1!; y += 25)
        if (!pleins.some((s) => pointDansPolygone({ x, y }, s))) vides.push(`${x},${y}`);
  return vides;
}

describe('aucune bande de terrain entre les sols et les murs (DES-33)', () => {
  const ctx = contexteTest();
  const base = niveauMaquette(ctx);
  const maison = [150, 150, 10_450, 8_450];

  it('refend, porteur ou non', () => {
    const refend = ok(
      ajouterMur(base, { a: { x: 5_000, y: 150 }, b: { x: 5_000, y: 8_450 }, type: 'mur' }, ctx),
    );
    expect(aDecouvert(refend, [maison])).toEqual([]);
    const porteur = ok(modifierMur(refend, refend.murs.at(-1)!.id, { porteur: true }, ctx));
    expect(aDecouvert(porteur, [maison])).toEqual([]);
  });

  it('pièce accolée sur l’axe, la face ou le coin du mur porteur', () => {
    for (const x of [10_450, 10_600])
      for (const y of [0, 150]) {
        const n = ok(pieceRectangle(base, { x, y }, { x: 14_000, y: 5_000 }, ctx));
        expect(aDecouvert(n, [maison, [x, y, 14_000, 5_000]]), `${x},${y}`).toEqual([]);
      }
  });
});
