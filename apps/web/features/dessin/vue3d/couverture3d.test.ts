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
  });
});
