import { describe, expect, it } from 'vitest';
import { scene as schemaScene, type Niveau, type Scene } from '../schemas/dessinScene';
import { CATALOGUE_OBJETS } from './catalogue';
import { metreScene } from './export';
import { nouvelleScene } from './migrations';
import { deplacerObjet } from './objets';
import { metreNiveau } from './metre';

/**
 * Budget DES-48 : 500 murs et 1 000 objets. Les calculs refaits à chaque image ou à chaque geste
 * restent bien sous 16 ms (60 i/s) ; seuils larges pour une machine d'intégration chargée.
 */
let k = 0;
const id = (p: string) => `${p}_perf${String(k++).padStart(6, '0')}`;
function grandeScene(): Scene {
  const s = nouvelleScene(id);
  const murs: Niveau['murs'] = [];
  const objets: Niveau['objets'] = [];
  const mur = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    murs.push({
      id: id('m'),
      a,
      b,
      epaisseur: 200,
      hauteur: 2_500,
      type: 'mur',
      porteur: false,
      alignement: 'axe',
      faceA: { famille: 'aucun' },
      faceB: { famille: 'aucun' },
    } as Niveau['murs'][number]);
  const modele = CATALOGUE_OBJETS[0]!;
  for (let c = 0; c < 25; c++)
    for (let r = 0; r < 5; r++) {
      const [x, y] = [c * 4_000, r * 4_000];
      mur({ x, y }, { x: x + 4_000, y });
      mur({ x: x + 4_000, y }, { x: x + 4_000, y: y + 4_000 });
      mur({ x: x + 4_000, y: y + 4_000 }, { x, y: y + 4_000 });
      mur({ x, y: y + 4_000 }, { x, y });
      for (let i = 0; i < 8; i++)
        objets.push({
          id: id('obj'),
          catalogueId: modele.id,
          position: { x: x + 800 + (i % 4) * 800, y: y + 1_000 + Math.floor(i / 4) * 2_000 },
          rotation: 0,
          dimensions: { l: 400, p: 400, h: 800 },
          materiaux: {},
          altitude: 0,
        });
    }
  return schemaScene.parse({ ...s, niveaux: [{ ...s.niveaux[0]!, murs, objets }] });
}

const duree = (f: () => unknown) => {
  const t = performance.now();
  f();
  return performance.now() - t;
};

describe('budget de performance (DES-48)', () => {
  it('500 murs, 1 000 objets : métré et glisser d’un meuble bien sous une image', () => {
    const s = grandeScene();
    const n = s.niveaux[0]!;
    expect(n.murs).toHaveLength(500);
    expect(n.objets).toHaveLength(1_000);
    metreNiveau(n); // échauffement
    // Mesuré ≈ 1,5 ms et ≈ 5 ms ; une image dure 16 ms.
    expect(duree(() => metreScene(s))).toBeLessThan(50);
    const o = n.objets[500]!;
    const glisser = duree(() =>
      deplacerObjet(n, o.id, { x: o.position.x + 50, y: o.position.y }, { aimant: true }),
    );
    expect(glisser).toBeLessThan(25);
  });
});
