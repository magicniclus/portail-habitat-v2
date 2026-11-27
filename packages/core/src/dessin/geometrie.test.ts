import { describe, expect, it } from 'vitest';
import { aimanter, toleranceEnMm } from './aimantation';
import { formatAngle, formatLongueur, formatSurface, formatVolume } from './format';
import {
  aire,
  aireSignee,
  centroide,
  decalerVersInterieur,
  distancePointSegment,
  intersectionSegments,
  aimanterAngle,
  orthogonal,
  perimetre,
  pointALongueur,
  pointDansPolygone,
  projeter,
} from './geometrie';

const carre = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
];
const espaces = (s: string) => s.replace(/\s/g, ' ');

describe('géométrie', () => {
  it('aire, périmètre, centroïde, orientation', () => {
    expect(aire(carre)).toBe(1_000_000);
    expect(aireSignee([...carre].reverse())).toBe(-1_000_000);
    expect(perimetre(carre)).toBe(4000);
    expect(centroide(carre)).toEqual({ x: 500, y: 500 });
  });

  it('point dans un polygone', () => {
    expect(pointDansPolygone({ x: 500, y: 500 }, carre)).toBe(true);
    expect(pointDansPolygone({ x: 1500, y: 500 }, carre)).toBe(false);
  });

  it('projection et distance à un segment', () => {
    expect(projeter({ x: 500, y: 300 }, { x: 0, y: 0 }, { x: 1000, y: 0 })).toEqual({
      point: { x: 500, y: 0 },
      t: 0.5,
    });
    expect(projeter({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 0 }).t).toBe(0);
    expect(distancePointSegment({ x: -300, y: 400 }, { x: 0, y: 0 }, { x: 1000, y: 0 })).toBe(500);
  });

  it('intersection de segments', () => {
    expect(
      intersectionSegments({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    ).toEqual({ x: 5, y: 5 });
    expect(
      intersectionSegments({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }),
    ).toBeNull();
    expect(
      intersectionSegments({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: -5 }, { x: 20, y: 5 }),
    ).toBeNull();
  });

  it('décalage vers l’intérieur, quel que soit le sens, côtés alignés compris', () => {
    const interieur = decalerVersInterieur(carre, [100, 100, 100, 100]);
    expect(aire(interieur)).toBe(800 * 800);
    expect(aire(decalerVersInterieur([...carre].reverse(), [100, 100, 100, 100]))).toBe(640_000);
    const avecSommetAligne = [{ x: 0, y: 0 }, { x: 500, y: 0 }, ...carre.slice(1)];
    expect(
      Math.round(aire(decalerVersInterieur(avecSommetAligne, [100, 100, 100, 100, 100]))),
    ).toBe(640_000);
  });
});

describe('aimantation', () => {
  const cibles = {
    points: [{ x: 1000, y: 1000 }],
    segments: [
      [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
      ],
    ] as const,
  };
  const options = { tolerance: 50 };

  it('par ordre de priorité', () => {
    expect(aimanter({ x: 1020, y: 990 }, cibles, options)).toEqual({
      point: { x: 1000, y: 1000 },
      type: 'extremite',
    });
    expect(aimanter({ x: 1010, y: 30 }, cibles, options).type).toBe('milieu');
    expect(aimanter({ x: 1500, y: 30 }, cibles, options)).toEqual({
      point: { x: 1500, y: 0 },
      type: 'segment',
    });
  });

  it('angle par pas de 15° depuis l’origine, puis grille, puis libre', () => {
    const vide = { points: [], segments: [] };
    const r = aimanter({ x: 3000, y: 3020 }, vide, { tolerance: 50, origine: { x: 0, y: 0 } });
    expect(r.type).toBe('angle');
    expect(r.point.x).toBe(r.point.y);
    expect(
      aimanter({ x: 3000, y: 3900 }, vide, { tolerance: 50, origine: { x: 0, y: 0 } }).type,
    ).toBe('libre');
    expect(aimanter({ x: 1240, y: 760 }, vide, { tolerance: 50, grille: 100 })).toEqual({
      point: { x: 1200, y: 800 },
      type: 'grille',
    });
    expect(aimanter({ x: 12.4, y: 7.6 }, vide, { tolerance: 1 })).toEqual({
      point: { x: 12, y: 8 },
      type: 'libre',
    });
  });

  it('alignement : même horizontale ou verticale qu’une extrémité, avec ses guides', () => {
    // Mur existant de (0, 0) à (4000, 0) ; on trace en parallèle depuis (0, 3000).
    const mur = {
      points: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
      ],
      segments: [],
    };
    const r = aimanter({ x: 3980, y: 3030 }, mur, { tolerance: 50, origine: { x: 0, y: 3000 } });
    expect(r).toMatchObject({ point: { x: 4000, y: 3000 }, type: 'alignement' });
    expect(r.guides).toEqual([
      { a: { x: 4000, y: 0 }, b: { x: 4000, y: 3000 } },
      { a: { x: 0, y: 3000 }, b: { x: 4000, y: 3000 } },
    ]);
    // Un seul axe aligné : l'autre coordonnée suit la grille.
    const v = aimanter({ x: 4020, y: 1234 }, mur, { tolerance: 50, grille: 50 });
    expect(v).toMatchObject({ point: { x: 4000, y: 1250 }, type: 'alignement' });
    expect(v.guides).toHaveLength(1);
    // Une extrémité proche reste prioritaire.
    expect(aimanter({ x: 4010, y: 10 }, mur, { tolerance: 50 }).type).toBe('extremite');
  });

  it('arrivée sur un mur : la direction calée depuis l’origine est gardée', () => {
    // Mur vertical x = 0 ; cloison partie de (3000, 2500) vers la gauche, curseur un peu haut.
    const mur = {
      points: [],
      segments: [
        [
          { x: 0, y: 0 },
          { x: 0, y: 6000 },
        ],
      ] as const,
    };
    const o = { tolerance: 50, origine: { x: 3000, y: 2500 } };
    expect(aimanter({ x: 20, y: 2470 }, mur, o)).toEqual({
      point: { x: 0, y: 2500 },
      type: 'segment',
    });
    // Trois tolérances au-dessus de l'horizontale : l'équerre l'emporte encore.
    expect(aimanter({ x: 20, y: 2360 }, mur, o).point).toEqual({ x: 0, y: 2500 });
    // Direction franchement oblique : pas de 15° (ici 45°).
    expect(
      aimanter(
        { x: 20, y: -500 },
        {
          segments: [
            [
              { x: 0, y: -2000 },
              { x: 0, y: 6000 },
            ],
          ],
          points: [],
        },
        o,
      ).point,
    ).toEqual({ x: 0, y: -500 });
    // Curseur loin de toute direction calée : simple projection sur le mur.
    expect(aimanter({ x: 20, y: 1300 }, mur, o).point).toEqual({ x: 0, y: 1300 });
    // Sans origine (premier point) : projection.
    expect(aimanter({ x: 20, y: 2470 }, mur, { tolerance: 50 }).point).toEqual({ x: 0, y: 2470 });
  });

  it('tolérance en mm selon le zoom', () => {
    expect(toleranceEnMm(10, 50)).toBe(200);
  });
});

describe('formats', () => {
  it('longueurs, surfaces, angles, volumes en français', () => {
    expect(espaces(formatLongueur(10_600))).toBe('10,60 m');
    expect(espaces(formatLongueur(10_600, 'cm'))).toBe('1 060 cm');
    expect(espaces(formatSurface(80_000_000))).toBe('80,0 m²');
    expect(formatAngle(30)).toBe('3°');
    expect(formatAngle(125)).toBe('12,5°');
    expect(espaces(formatVolume(45_000))).toBe('45,0 m³');
  });
});

describe('tracé au clavier (DES-06)', () => {
  it('Maj : horizontal ou vertical selon le plus grand écart', () => {
    expect(orthogonal({ x: 0, y: 0 }, { x: 4000, y: 300 })).toEqual({ x: 4000, y: 0 });
    expect(orthogonal({ x: 0, y: 0 }, { x: 200, y: -3000 })).toEqual({ x: 0, y: -3000 });
    // Aimant doux des angles courants : accroché près de 0°, 45°, 90°… ; libre ailleurs.
    expect(aimanterAngle({ x: 0, y: 0 }, { x: 3000, y: 300 })).toEqual({ x: 3015, y: 0 });
    expect(aimanterAngle({ x: 0, y: 0 }, { x: 2000, y: 2100 })).toEqual({ x: 2051, y: 2051 });
    expect(aimanterAngle({ x: 0, y: 0 }, { x: 3000, y: 1000 })).toEqual({ x: 3000, y: 1000 });
    expect(aimanterAngle({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
  });
  it('longueur tapée dans la direction du curseur', () => {
    expect(pointALongueur({ x: 0, y: 0 }, { x: 10, y: 0 }, 4200)).toEqual({ x: 4200, y: 0 });
    expect(pointALongueur({ x: 0, y: 0 }, { x: 3, y: 4 }, 500)).toEqual({ x: 300, y: 400 });
    expect(pointALongueur({ x: 0, y: 0 }, { x: 0, y: 0 }, 500)).toBeNull();
    expect(pointALongueur({ x: 0, y: 0 }, { x: 1, y: 0 }, 0)).toBeNull();
  });
});
