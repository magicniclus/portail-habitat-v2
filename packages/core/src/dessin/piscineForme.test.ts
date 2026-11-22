import { describe, expect, it } from 'vitest';
import type { Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { ajouterTerrasse, contourPiscine } from './exterieur';
import { redimensionnerPiscine, tracerPiscine } from './piscineForme';

describe('piscine tracée comme un sol (DES-20)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);

  it('deux coins : centre, longueur, largeur et sens ; un clic : taille par défaut', () => {
    const r = ok(
      tracerPiscine(n, { x: 1_000, y: 10_000 }, { x: 9_000, y: 14_000 }, 'rectangle', ctx),
    );
    const p = r.exterieur.piscines[0]!;
    expect(p).toMatchObject({
      position: { x: 5_000, y: 12_000 },
      longueur: 8_000,
      largeur: 4_000,
      rotation: 0,
    });
    const debout = ok(
      tracerPiscine(n, { x: 12_000, y: 0 }, { x: 15_000, y: 9_000 }, 'couloir', ctx),
    );
    expect(debout.exterieur.piscines[0]).toMatchObject({
      longueur: 9_000,
      largeur: 3_000,
      rotation: 900,
    });
    const clic = ok(
      tracerPiscine(n, { x: 5_000, y: 12_000 }, { x: 5_100, y: 12_050 }, 'rectangle', ctx),
    );
    expect(clic.exterieur.piscines[0]).toMatchObject({ longueur: 8_000, largeur: 4_000 });
  });

  it('posée sur une terrasse ; coin tiré : le coin opposé ne bouge pas', () => {
    let r: Niveau = ok(ajouterTerrasse(n, { x: 0, y: 9_000 }, { x: 10_000, y: 16_000 }, ctx));
    r = ok(tracerPiscine(r, { x: 1_000, y: 10_000 }, { x: 9_000, y: 14_000 }, 'rectangle', ctx));
    const p = r.exterieur.piscines[0]!;
    const avant = contourPiscine(p);
    r = ok(redimensionnerPiscine(r, p.id, 2, { x: 11_000, y: 15_000 }));
    const apres = r.exterieur.piscines[0]!;
    expect(apres).toMatchObject({ longueur: 10_000, largeur: 5_000 });
    expect(contourPiscine(apres)[0]).toEqual(avant[0]);
    expect(redimensionnerPiscine(r, 'pi_absent', 0, { x: 0, y: 0 }).ok).toBe(false);
    // Jamais sur la maison.
    expect(redimensionnerPiscine(r, p.id, 0, { x: 5_000, y: 5_000 }).ok).toBe(false);
  });
});
