import { describe, expect, it } from 'vitest';
import {
  definirToiture,
  detecterPieces,
  mursDepuisForme,
  niveau as schemaNiveau,
  pointDansPolygone,
  synchroniserPieces,
  toit3D,
} from '@ph/core/dessin';
import { aretesHautes, geometrieCouverture } from './couverture3d';

type P3 = { x: number; y: number; z: number };
/** Haut du toit au point (x, y) : le plus haut des pans qui le couvrent (null : hors du toit). */
function hautDuToit(pans: readonly P3[][], x: number, y: number): number | null {
  let haut: number | null = null;
  for (const pan of pans) {
    if (!pointDansPolygone({ x, y }, pan)) continue;
    const n = { x: 0, y: 0, z: 0 };
    pan.forEach((p, i) => {
      const q = pan[(i + 1) % pan.length]!;
      n.x += (p.y - q.y) * (p.z + q.z);
      n.y += (p.z - q.z) * (p.x + q.x);
      n.z += (p.x - q.x) * (p.y + q.y);
    });
    const o = pan[0]!;
    const z = o.z - (n.x * (x - o.x) + n.y * (y - o.y)) / n.z;
    haut = Math.max(haut ?? -Infinity, z);
  }
  return haut;
}

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

  it('chaque faîtière est un vrai sommet du toit : plus bas des deux côtés, rien au-dessus', () => {
    // Ailes alignées sur un côté de la maison (côtés dans le même plan) : ni arêtier fantôme
    // vers le coin extérieur, ni faîtage prolongé sous le toit voisin.
    const id = (p: string) => `${p}_t${Math.random().toString(36).slice(2, 10)}`;
    const formes = [
      {
        forme: 'L',
        largeur: 10_730,
        profondeur: 12_450,
        decoupe: { largeur: 7_230, profondeur: 6_200 },
      },
      {
        forme: 'L',
        largeur: 12_000,
        profondeur: 10_000,
        decoupe: { largeur: 5_000, profondeur: 4_000 },
      },
      {
        forme: 'U',
        largeur: 14_000,
        profondeur: 10_000,
        decoupe: { largeur: 6_000, profondeur: 5_000 },
      },
      {
        forme: 'T',
        largeur: 12_000,
        profondeur: 10_000,
        decoupe: { largeur: 4_000, profondeur: 5_000 },
      },
    ] as const;
    const defauts: string[] = [];
    for (const f of formes)
      for (const type of ['quatre_pans', 'croupe', 'deux_pans', 'mansarde'] as const) {
        const murs = mursDepuisForme(f, { epaisseur: 200, hauteur: 2_500, nouvelId: id });
        if (!murs.ok) throw new Error(murs.message);
        const base = schemaNiveau.parse({ id: id('n'), nom: 'RDC', type: 'rdc', altitude: 0 });
        const n = {
          ...base,
          murs: murs.data,
          pieces: synchroniserPieces([], detecterPieces(murs.data), () => id('p')),
        };
        const r = definirToiture(n, type);
        if (!r.ok) throw new Error(r.message);
        const pans = toit3D(r.data)!.pans;
        for (const [a, b] of aretesHautes(pans)) {
          const l = Math.hypot(b.x - a.x, b.y - a.y);
          const nrm = { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
          for (const k of [0.25, 0.5, 0.75]) {
            const m = {
              x: a.x + (b.x - a.x) * k,
              y: a.y + (b.y - a.y) * k,
              z: a.z + (b.z - a.z) * k,
            };
            const ici = hautDuToit(pans, m.x, m.y) ?? -Infinity;
            const cotes = [1, -1].map((s) =>
              hautDuToit(pans, m.x + nrm.x * 150 * s, m.y + nrm.y * 150 * s),
            );
            if (ici > m.z + 5 || cotes.some((z) => z !== null && z > m.z - 5))
              defauts.push(
                `${f.forme} ${type} : faîtière (${Math.round(m.x)}, ${Math.round(m.y)})`,
              );
          }
        }
      }
    expect(defauts).toEqual([]);
  });
});
