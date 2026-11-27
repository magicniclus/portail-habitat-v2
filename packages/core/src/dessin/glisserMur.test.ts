import { describe, expect, it } from 'vitest';
import { reperesDuGlissement, viserGlissementMur } from './glisserMur';
import type { Niveau } from '../schemas/dessinScene';

const mur = (id: string, ax: number, ay: number, bx: number, by: number) =>
  ({ id, a: { x: ax, y: ay }, b: { x: bx, y: by } }) as Niveau['murs'][number];

// Pièce 4 m × 3 m : le mur de droite (x = 4000) est relié en haut et en bas.
const piece = {
  murs: [
    mur('h', 0, 0, 4000, 0),
    mur('d', 4000, 0, 4000, 3000),
    mur('b', 4000, 3000, 0, 3000),
    mur('g', 0, 3000, 0, 0),
  ],
} as Niveau;
const depart = { a: { x: 4000, y: 0 }, b: { x: 4000, y: 3000 } };

describe('glisser un mur (DES-06)', () => {
  it('un mur relié ne bouge que perpendiculairement : les murs voisins restent d’équerre', () => {
    const r = viserGlissementMur(piece, 'd', depart, { x: 730, y: 410 }, { tolerance: 100 });
    expect(r.delta).toEqual({ x: 730, y: 0 });
  });

  it('se cale sur l’alignement d’un repère proche et l’affiche', () => {
    const r = viserGlissementMur(
      piece,
      'd',
      depart,
      { x: 1460, y: 0 },
      { tolerance: 100, reperes: [{ x: 5500, y: -2000 }] },
    );
    expect(r.delta).toEqual({ x: 1500, y: 0 });
    expect(r.guides).toEqual([{ a: { x: 5500, y: -2000 }, b: { x: 5500, y: 0 } }]);
  });

  it('Alt : sans aimant, mais toujours d’équerre', () => {
    const r = viserGlissementMur(
      piece,
      'd',
      depart,
      { x: 1460, y: 80 },
      { tolerance: 100, reperes: [{ x: 5500, y: 0 }], libre: true },
    );
    expect(r).toEqual({ delta: { x: 1460, y: 0 }, guides: [] });
  });

  it('un mur isolé se déplace aussi le long de lui-même, calé sur les deux axes', () => {
    const seul = { murs: [...piece.murs, mur('i', 6000, 0, 6000, 1000)] } as Niveau;
    const r = viserGlissementMur(
      seul,
      'i',
      { a: { x: 6000, y: 0 }, b: { x: 6000, y: 1000 } },
      { x: -1970, y: 2960 },
      { tolerance: 100, reperes: reperesDuGlissement(seul, 'i') },
    );
    // x = 4000 (mur de droite) et y = 3000 (bas de la pièce) : alignements retrouvés.
    expect(r.delta).toEqual({ x: -2000, y: 3000 });
    expect(r.guides).toHaveLength(2);
  });

  it('les repères excluent les extrémités qui bougent avec le mur et ajoutent les autres niveaux', () => {
    const dessous = { murs: [mur('x', -500, -500, 9000, -500)] } as Niveau;
    const r = reperesDuGlissement(piece, 'd', [dessous]);
    expect(r).toContainEqual({ x: 0, y: 0 });
    expect(r).toContainEqual({ x: 9000, y: -500 });
    expect(r).not.toContainEqual({ x: 4000, y: 0 });
    expect(reperesDuGlissement(piece, 'inconnu')).toEqual([]);
  });

  it('un mur introuvable ne bouge pas autrement que demandé', () => {
    const r = viserGlissementMur(piece, 'inconnu', depart, { x: 12, y: 7 }, { tolerance: 100 });
    expect(r).toEqual({ delta: { x: 12, y: 7 }, guides: [] });
  });

  it('sans repère proche : pas de 10 mm', () => {
    const r = viserGlissementMur(piece, 'd', depart, { x: 734, y: 0 }, { tolerance: 100 });
    expect(r.delta).toEqual({ x: 730, y: 0 });
  });
});
