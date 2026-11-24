import { describe, expect, it } from 'vitest';
import {
  definirToiture,
  detecterPieces,
  mursDepuisForme,
  niveau as schemaNiveau,
  synchroniserPieces,
  toit3D,
} from '@ph/core/dessin';
import { aretesHautes, geometrieCouverture } from './couverture3d';

describe('couverture en volume', () => {
  it('pas de chant sur une arête partagée par deux pans (faîtage) : pas de pointillé', () => {
    // Deux pans d'un toit à deux pentes, qui se rejoignent au faîtage (y = 2 000, z = 1 000).
    const nord = [
      { x: 0, y: 0, z: 0 },
      { x: 4_000, y: 0, z: 0 },
      { x: 4_000, y: 2_000, z: 1_000 },
      { x: 0, y: 2_000, z: 1_000 },
    ];
    const sud = [
      { x: 0, y: 4_000, z: 0 },
      { x: 4_000, y: 4_000, z: 0 },
      { x: 4_000, y: 2_000, z: 1_000 },
      { x: 0, y: 2_000, z: 1_000 },
    ];
    const seul = geometrieCouverture([nord], 0, 50).rives.getAttribute('position').count;
    const deux = geometrieCouverture([nord, sud], 0, 50).rives.getAttribute('position').count;
    // Seul : sous-face (2 triangles) + 4 chants (8 triangles). À deux : le faîtage sans chant.
    expect(seul).toBe(30);
    expect(deux).toBe(2 * 30 - 2 * 6);
  });

  it('faîtières : sur le faîtage et les arêtiers, jamais dans une noue', () => {
    const pente = (z0: number, z1: number) => [
      { x: 0, y: 0, z: z0 },
      { x: 4_000, y: 0, z: z0 },
      { x: 4_000, y: 2_000, z: z1 },
      { x: 0, y: 2_000, z: z1 },
    ];
    const symetrique = (pan: { x: number; y: number; z: number }[]) =>
      pan.map((p) => ({ ...p, y: 4_000 - p.y }));
    // Faîtage : les deux pans descendent de part et d'autre.
    expect(aretesHautes([pente(0, 1_000), symetrique(pente(0, 1_000))])).toHaveLength(1);
    // Noue : les deux pans remontent de part et d'autre.
    expect(aretesHautes([pente(1_000, 0), symetrique(pente(1_000, 0))])).toHaveLength(0);
  });

  it('maison en L : aucune faîtière ne part du creux du L (noue)', () => {
    const id = (p: string) => `${p}_t${Math.random().toString(36).slice(2, 10)}`;
    const r = mursDepuisForme(
      {
        forme: 'L',
        largeur: 12_000,
        profondeur: 10_000,
        decoupe: { largeur: 5_000, profondeur: 4_000 },
      },
      { epaisseur: 300, hauteur: 2_500, nouvelId: id },
    );
    if (!r.ok) throw new Error(r.message);
    const base = schemaNiveau.parse({ id: id('n'), nom: 'RDC', type: 'rdc', altitude: 0 });
    const n = {
      ...base,
      murs: r.data,
      pieces: synchroniserPieces([], detecterPieces(r.data), () => id('p')),
    };
    const avecToit = definirToiture(n, 'deux_pans');
    if (!avecToit.ok) throw new Error(avecToit.message);
    const t = toit3D(avecToit.data)!;
    const egout = Math.min(...t.pans.flat().map((p) => p.z));
    // Creux du L : le coin rentrant, à l'égout.
    const creux = { x: 7_000, y: 4_000 };
    for (const [a, b] of aretesHautes(t.pans))
      for (const p of [a, b])
        expect(Math.hypot(p.x - creux.x, p.y - creux.y) > 800 || p.z > egout + 200).toBe(true);
    expect(aretesHautes(t.pans).length).toBeGreaterThan(0);
    // Deux pans : seulement des faîtages (horizontaux), jamais une faîtière en biais sur un pan.
    for (const [a, b] of aretesHautes(t.pans)) expect(Math.abs(a.z - b.z)).toBeLessThan(2);
    // Quatre pans sur un rectangle : un faîtage et quatre arêtiers, rien d'autre.
    const rect = mursDepuisForme(
      { forme: 'rectangle', largeur: 10_000, profondeur: 8_000 },
      { epaisseur: 300, hauteur: 2_500, nouvelId: id },
    );
    if (!rect.ok) throw new Error(rect.message);
    const quatre = definirToiture(
      {
        ...n,
        murs: rect.data,
        pieces: synchroniserPieces([], detecterPieces(rect.data), () => id('p')),
      },
      'quatre_pans',
    );
    if (!quatre.ok) throw new Error(quatre.message);
    expect(aretesHautes(toit3D(quatre.data)!.pans)).toHaveLength(5);
  });

  it('pan en L (après réunion des ailes) : rendu exact, aucun triangle hors du pan', () => {
    // Pan plat en L : 4 m × 4 m moins un carré de 2 m × 2 m = 12 m².
    // Premier sommet au bout d'une branche : un éventail depuis lui déborde sur l'encoche.
    const L = [
      [4_000, 2_000],
      [2_000, 2_000],
      [2_000, 4_000],
      [0, 4_000],
      [0, 0],
      [4_000, 0],
    ].map(([x, y]) => ({ x: x!, y: y!, z: 3_000 }));
    const { dessus } = geometrieCouverture([L], 0, 50);
    const p = dessus.getAttribute('position');
    let aire = 0;
    for (let i = 0; i < p.count; i += 3) {
      const [a, b, c] = [i, i + 1, i + 2].map((k) => [p.getX(k), p.getZ(k)] as const);
      aire += Math.abs((b![0] - a![0]) * (c![1] - a![1]) - (c![0] - a![0]) * (b![1] - a![1])) / 2;
    }
    expect(aire).toBeCloseTo(12, 3);
  });
});
