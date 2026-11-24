import { describe, expect, it } from 'vitest';
import type { Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { viserExterieur } from './aimantExterieur';
import { ajouterTerrasse, contourPiscine } from './exterieur';
import { tracerPiscine } from './piscineForme';

describe('poignées des terrasses et piscines aimantées (DES-18, DES-20)', () => {
  const ctx = contexteTest();
  let n: Niveau = niveauMaquette(ctx);
  n = ok(ajouterTerrasse(n, { x: 0, y: 9_000 }, { x: 4_000, y: 12_000 }, ctx));
  n = ok(ajouterTerrasse(n, { x: 6_000, y: 9_000 }, { x: 10_000, y: 12_000 }, ctx));
  n = ok(tracerPiscine(n, { x: 12_000, y: 1_000 }, { x: 15_000, y: 7_000 }, 'rectangle', ctx));
  const [t1, t2] = n.exterieur.terrasses;
  const piscine = n.exterieur.piscines[0]!;

  it('s’accroche aux angles de la maison, des autres terrasses et des piscines', () => {
    const cible = { genre: 'terrasse', id: t1!.id } as const;
    expect(viserExterieur(n, cible, { x: 10_570, y: 8_630 }, 100)).toEqual({ x: 10_600, y: 8_600 });
    expect(viserExterieur(n, cible, { x: 6_040, y: 11_630 }, 100)).toEqual({ x: 6_000, y: 11_600 });
    const coin = contourPiscine(piscine)[0]!;
    expect(viserExterieur(n, cible, { x: coin.x + 40, y: coin.y - 30 }, 100)).toEqual(coin);
  });

  it('s’aligne sur un angle éloigné ; ne vise jamais la forme qu’on tire', () => {
    const vers = viserExterieur(n, { genre: 'terrasse', id: t1!.id }, { x: 6_030, y: 15_013 }, 100);
    expect(vers.x).toBe(6_000);
    // Les coins de la piscine tirée ne l'attirent pas.
    const coin = contourPiscine(piscine)[2]!;
    const p = { x: coin.x + 37, y: coin.y + 41 };
    expect(viserExterieur(n, { genre: 'piscine', id: piscine.id }, p, 100)).not.toEqual(coin);
    expect(
      viserExterieur(n, { genre: 'terrasse', id: t2!.id }, { x: 3_980, y: 8_620 }, 100),
    ).toEqual({
      x: 4_000,
      y: 8_600,
    });
  });
});
