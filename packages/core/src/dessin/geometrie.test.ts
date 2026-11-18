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
  perimetre,
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
    expect(espaces(formatVolume(45_000))).toBe('45 000 L');
  });
});
