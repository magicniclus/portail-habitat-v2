import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette } from './aidesTest';
import { cotesMurs } from './cotation';

const ctx = contexteTest();
// Maquette : rectangle de murs de 30 cm, axe de (150, 150) à (10 450, 8 450), une pièce dedans.
const n = niveauMaquette(ctx);

describe('cotation des murs (DES-10)', () => {
  it('mur extérieur : cote dehors, parallèle, à l’écart de la face', () => {
    const cotes = cotesMurs(n, 600);
    const haut = cotes.find((c) => c.murId === n.murs[0]!.id)!;
    expect(haut.exterieure).toBe(true);
    expect(haut.longueur).toBe(10_300);
    // Mur du haut (y = 150), extérieur vers y < 0 : ligne à 150 − 150 − 600.
    expect(haut.a.y).toBe(-600);
    expect(haut.b.y).toBe(-600);
    expect(haut.attacheA.y).toBe(0);
    expect(haut.angle).toBe(0);
  });

  it('texte toujours lisible : angle ramené entre −90° et 90°', () => {
    for (const c of cotesMurs(n, 600)) expect(Math.abs(c.angle)).toBeLessThanOrEqual(90);
  });

  it('cloison entre deux pièces : cote intérieure, tout contre le mur', () => {
    const cloison = {
      ...n.murs[0]!,
      id: 'm_cloison',
      a: { x: 5000, y: 150 },
      b: { x: 5000, y: 8450 },
      epaisseur: 100,
    };
    const deuxPieces = {
      ...n,
      murs: [...n.murs, cloison],
      pieces: [
        {
          ...n.pieces[0]!,
          contour: [
            { x: 300, y: 300 },
            { x: 4950, y: 300 },
            { x: 4950, y: 8300 },
            { x: 300, y: 8300 },
          ],
        },
        {
          ...n.pieces[0]!,
          id: 'p_deux',
          contour: [
            { x: 5050, y: 300 },
            { x: 10300, y: 300 },
            { x: 10300, y: 8300 },
            { x: 5050, y: 8300 },
          ],
        },
      ],
    };
    const c = cotesMurs(deuxPieces, 600).find((x) => x.murId === 'm_cloison')!;
    expect(c.exterieure).toBe(false);
    expect(Math.abs(c.a.x - 5000)).toBe(200);
  });
});
