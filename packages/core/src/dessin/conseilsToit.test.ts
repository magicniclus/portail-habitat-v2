import { describe, expect, it } from 'vitest';
import { niveau as schemaNiveau, type Mur } from '../schemas/dessinScene';
import { contexteTest } from './aidesTest';
import { conseilsToit } from './conseilsToit';
import { mursDepuisForme, type Forme } from './formes';
import { pointDansPolygone } from './geometrie';
import { detecterPieces, synchroniserPieces } from './pieces';

const ctx = contexteTest();
const niveau = (murs: Mur[]) => ({
  ...schemaNiveau.parse({ id: 'n_rdc0', nom: 'RDC', type: 'rdc', altitude: 0 }),
  murs,
  pieces: synchroniserPieces([], detecterPieces(murs), () => ctx.nouvelId('p')),
});
const forme = (f: Forme) => {
  const r = mursDepuisForme(f, { epaisseur: 200, hauteur: 2_500, nouvelId: ctx.nouvelId });
  if (!r.ok) throw new Error(r.message);
  return niveau(r.data);
};
/** Murs le long d'un contour fermé (axes, mm). */
const contour = (pts: [number, number][]): Mur[] =>
  pts.map(([x, y], i) => {
    const [bx, by] = pts[(i + 1) % pts.length]!;
    return {
      id: ctx.nouvelId('m'),
      a: { x, y },
      b: { x: bx, y: by },
      type: 'mur' as const,
      epaisseur: 200,
      hauteur: 2_500,
      porteur: true,
    } as Mur;
  });
const conseilles = (c: ReturnType<typeof conseilsToit>) =>
  Object.entries(c)
    .filter(([, raison]) => raison === null)
    .map(([t]) => t)
    .sort();

describe('toits conseillés selon la forme de la maison (DES-16)', () => {
  it('petit rectangle : tout convient sauf la mansarde (trop étroit)', () => {
    const c = conseilsToit(forme({ forme: 'rectangle', largeur: 8_000, profondeur: 5_000 }));
    expect(conseilles(c)).toEqual(['croupe', 'deux_pans', 'monopente', 'plate', 'quatre_pans']);
    expect(c.mansarde).toMatch(/étroite/);
  });

  it('grand rectangle : le monopente monterait trop haut', () => {
    const c = conseilsToit(forme({ forme: 'rectangle', largeur: 12_000, profondeur: 9_000 }));
    expect(c.monopente).toMatch(/haut/);
    expect(c.mansarde).toBeNull();
    expect(c.deux_pans).toBeNull();
  });

  it('maison en L : deux pans, quatre pans ou plat ; le reste est signalé', () => {
    const c = conseilsToit(
      forme({
        forme: 'L',
        largeur: 12_000,
        profondeur: 10_000,
        decoupe: { largeur: 5_000, profondeur: 4_000 },
      }),
    );
    expect(conseilles(c)).toEqual(['deux_pans', 'plate', 'quatre_pans']);
    for (const t of ['monopente', 'croupe', 'mansarde'] as const)
      expect(c[t]).toMatch(/plusieurs parties/);
  });

  it('maison autour d’un patio : quatre pans ou plat', () => {
    // Quatre ailes autour d'une cour de 4 m × 4 m, marquée « patio ».
    const rect = (x0: number, y0: number, x1: number, y1: number) =>
      contour([
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ]);
    const n = niveau([
      ...rect(0, 0, 12_000, 4_000),
      ...rect(0, 8_000, 12_000, 12_000),
      ...rect(0, 4_000, 4_000, 8_000),
      ...rect(8_000, 4_000, 12_000, 8_000),
    ]);
    const patio = {
      ...n,
      pieces: n.pieces.map((p) =>
        pointDansPolygone({ x: 6_000, y: 6_000 }, p.contour) ? { ...p, type: 'patio' as const } : p,
      ),
    };
    const c = conseilsToit(patio);
    expect(conseilles(c)).toEqual(['plate', 'quatre_pans']);
    expect(c.deux_pans).toMatch(/patio/);
  });

  it('mur en biais : la mansarde est signalée', () => {
    const c = conseilsToit(
      niveau(
        contour([
          [0, 0],
          [10_000, 0],
          [12_000, 8_000],
          [0, 8_000],
        ]),
      ),
    );
    expect(c.mansarde).toMatch(/biais/);
  });

  it('niveau entièrement couvert par l’étage, ou sans murs : aucun avis', () => {
    const n = forme({ forme: 'rectangle', largeur: 8_000, profondeur: 6_000 });
    expect(conseilles(conseilsToit(n, n))).toHaveLength(6);
    expect(conseilles(conseilsToit({ ...n, murs: [], pieces: [] }))).toHaveLength(6);
  });
});
