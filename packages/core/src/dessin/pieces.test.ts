import { describe, expect, it } from 'vitest';
import { mur as schemaMur, type Mur, type Piece } from '../schemas/dessinScene';
import { aire } from './geometrie';
import { contexteTest, niveauMaquette } from './aidesTest';
import {
  detecterPieces,
  LIBELLES_PIECE,
  surfaceCarrez,
  synchroniserPieces,
  typerPiece,
} from './pieces';

let n = 0;
const m = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  e = 300,
  type: Mur['type'] = 'mur',
): Mur =>
  schemaMur.parse({
    id: `m_test${String(n++).padStart(4, '0')}`,
    a: { x: ax, y: ay },
    b: { x: bx, y: by },
    epaisseur: e,
    hauteur: 2500,
    type,
  });

/** Pièce de la maquette : 10,60 × 8,60 m hors tout, murs de 30 cm → 10,00 × 8,00 m intérieurs. */
const rectangle = (e = 300) => [
  m(150, 150, 10450, 150, e),
  m(10450, 150, 10450, 8450, e),
  m(10450, 8450, 150, 8450, e),
  m(150, 8450, 150, 150, e),
];

describe('detecterPieces', () => {
  it('trouve la pièce de la maquette : 80,0 m² intérieurs', () => {
    const [p, ...autres] = detecterPieces(rectangle());
    expect(autres).toHaveLength(0);
    expect(p!.surface).toBe(80_000_000);
    expect(p!.perimetre).toBe(36_000);
    expect(p!.contourAxes).toHaveLength(4);
  });

  it('ne dépend pas du sens de tracé des murs', () => {
    const inverses = rectangle().map((w) => ({ ...w, a: w.b, b: w.a }));
    expect(detecterPieces(inverses)[0]!.surface).toBe(80_000_000);
  });

  it('une cloison en T coupe la pièce en deux', () => {
    const murs = [...rectangle(), m(150, 4150, 10450, 4150, 70, 'cloison')];
    const pieces = detecterPieces(murs).sort((a, b) => a.surface - b.surface);
    expect(pieces).toHaveLength(2);
    const total = pieces.reduce((s, p) => s + p.surface, 0);
    // 80 m² moins l'emprise de la cloison (10 m × 7 cm = 0,7 m²).
    expect(total).toBe(80_000_000 - 10_000 * 70);
  });

  it('deux cloisons qui se croisent donnent quatre pièces', () => {
    const murs = [
      ...rectangle(),
      m(150, 4300, 10450, 4300, 0, 'separation'),
      m(5300, 150, 5300, 8450, 0, 'separation'),
    ];
    expect(detecterPieces(murs)).toHaveLength(4);
  });

  it('ignore un mur en cul-de-sac, un muret et une forme ouverte', () => {
    const murs = [...rectangle(), m(150, 4150, 4000, 4150, 70, 'cloison')];
    expect(detecterPieces(murs)).toHaveLength(1);
    expect(detecterPieces([...rectangle(), m(1000, 1000, 2000, 1000, 150, 'muret')])).toHaveLength(
      1,
    );
    expect(detecterPieces(rectangle().slice(0, 3))).toHaveLength(0);
    expect(detecterPieces([])).toHaveLength(0);
  });
});

describe('synchroniserPieces', () => {
  const [d] = detecterPieces(rectangle());
  let k = 0;
  const nouvelId = () => `p_neuf${k++}`;

  it('garde le nom et les revêtements de la pièce qui était là', () => {
    const ancienne: Piece = {
      id: 'p_sejour',
      contour: d!.contour,
      nom: 'Séjour',
      type: 'sejour',
      sol: { famille: 'parquet' },
      plafond: { famille: 'peinture' },
      zonesBasses: [],
    };
    const [p] = synchroniserPieces([ancienne], [d!], nouvelId);
    expect(p).toMatchObject({ id: 'p_sejour', nom: 'Séjour', sol: { famille: 'parquet' } });
  });

  it('nomme les nouvelles pièces', () => {
    expect(synchroniserPieces([], [d!], nouvelId)[0]).toMatchObject({
      id: 'p_neuf0',
      nom: 'Pièce 1',
      type: 'autre',
    });
  });
});

describe('surfaceCarrez', () => {
  it('retire les zones sous 1,80 m', () => {
    const contour = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ];
    const basse = [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 500 },
      { x: 0, y: 500 },
    ];
    expect(surfaceCarrez({ contour, zonesBasses: [basse] })).toBe(aire(contour) - 2_000_000);
    expect(surfaceCarrez({ contour, zonesBasses: [contour, contour] })).toBe(0);
  });
});

describe('type de pièce (DES-11)', () => {
  it('donne le nom du type à une pièce sans nom choisi, garde un nom choisi', () => {
    const n = niveauMaquette(contexteTest());
    const id = n.pieces[0]!.id;
    const r = typerPiece(n, id, 'cuisine');
    expect(r.ok && r.data.pieces[0]).toMatchObject({ type: 'cuisine', nom: 'Cuisine' });
    const nommee = { ...n, pieces: [{ ...n.pieces[0]!, nom: 'Labo photo' }] };
    const r2 = typerPiece(nommee, id, 'bureau');
    expect(r2.ok && r2.data.pieces[0]).toMatchObject({ type: 'bureau', nom: 'Labo photo' });
    const r3 = typerPiece(n, id, 'autre');
    expect(r3.ok && r3.data.pieces[0]!.nom).toBe(n.pieces[0]!.nom);
    expect(typerPiece(n, 'p_absent', 'wc')).toMatchObject({ code: 'INTROUVABLE' });
    expect(Object.keys(LIBELLES_PIECE)).toHaveLength(15);
  });
});
