import { describe, expect, it } from 'vitest';
import { scene as schemaScene, type Scene } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { definirParcelle } from './exterieur';
import {
  ajusterImplantation,
  centreMaison,
  coinsOrthophoto,
  distancesAuxLimites,
  implanterParcelle,
  sceneSansLocalisation,
  l93VersPlan,
  planVersL93,
  versLambert93,
  type ParcelleCadastre,
} from './implantation';
import { nouvelleScene } from './migrations';
const ctx = contexteTest();
const maison = (): Scene => ({ ...nouvelleScene(ctx.nouvelId), niveaux: [niveauMaquette(ctx)] });
/** Parcelle de 30 × 20 m autour du point Lambert-93 (700 000 m ; 6 600 000 m). */
const PARCELLE: ParcelleCadastre = {
  reference: '01001000AB0012',
  codeInsee: '01001',
  contour: [
    { x: 700_000_000, y: 6_600_000_000 },
    { x: 700_030_000, y: 6_600_000_000 },
    { x: 700_030_000, y: 6_600_020_000 },
    { x: 700_000_000, y: 6_600_020_000 },
  ],
  orthophoto: {
    storagePath: 'dessin/particulier/u/p/ortho-1.jpg',
    emprise: { x0: 699_990_000, y0: 6_599_990_000, x1: 700_040_000, y1: 6_600_030_000 },
  },
};

describe('projection Lambert-93', () => {
  it('origine de la projection (3° E, 46,5° N) : 700 000 m ; 6 600 000 m', () => {
    const p = versLambert93(3, 46.5);
    expect(Math.abs(p.x - 700_000_000)).toBeLessThan(500);
    expect(Math.abs(p.y - 6_600_000_000)).toBeLessThan(500);
  });

  it('Paris (Notre-Dame) tombe là où l’IGN le place, au mètre près', () => {
    const p = versLambert93(2.3499, 48.853);
    expect(p.x / 1000).toBeGreaterThan(652_000);
    expect(p.x / 1000).toBeLessThan(653_000);
    expect(p.y / 1000).toBeGreaterThan(6_861_500);
    expect(p.y / 1000).toBeLessThan(6_862_500);
  });

  it('plan ↔ Lambert-93 : nord en haut, est à droite ; aller-retour exact', () => {
    const g = { x: 1_000_000, y: 6_000_000_000 };
    expect(l93VersPlan({ x: g.x + 1000, y: g.y }, g, 0)).toEqual({ x: 1000, y: 0 });
    expect(l93VersPlan({ x: g.x, y: g.y + 1000 }, g, 0)).toEqual({ x: 0, y: -1000 });
    // Nord tourné de 90° (vers la droite) : le nord est à droite, l'est en bas.
    expect(l93VersPlan({ x: g.x, y: g.y + 1000 }, g, 900)).toEqual({ x: 1000, y: 0 });
    const p = { x: 1234, y: -5678 };
    expect(l93VersPlan(planVersL93(p, g, 300), g, 300)).toEqual(p);
  });
});

describe('implantation sur la parcelle (DES-35)', () => {
  it('parcelle du cadastre centrée sur la maison, référence et photo gardées', () => {
    const s = ok(implanterParcelle(maison(), PARCELLE));
    const t = s.terrain!;
    const xs = t.parcelle.map((p) => p.x);
    const ys = t.parcelle.map((p) => p.y);
    const c = centreMaison(s);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBe(c.x);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBe(c.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(30_000);
    expect(t.referenceCadastrale).toBe('01001000AB0012');
    expect(t.codeInsee).toBe('01001');
    expect(schemaScene.safeParse(s).success).toBe(true);
    const o = coinsOrthophoto(s)!;
    expect(o.bd.x - o.hg.x).toBe(50_000);
    expect(o.bd.y - o.hg.y).toBe(40_000);
  });

  it('refuse un contour illisible ou trop grand ; code INSEE douteux ignoré', () => {
    expect(implanterParcelle(maison(), { ...PARCELLE, contour: [] }).ok).toBe(false);
    const grand = PARCELLE.contour.map((q, i) => (i === 1 ? { ...q, x: q.x + 5_000_000 } : q));
    expect(implanterParcelle(maison(), { ...PARCELLE, contour: grand }).ok).toBe(false);
    const s = ok(implanterParcelle(nouvelleScene(ctx.nouvelId), { ...PARCELLE, codeInsee: 'x' }));
    expect(s.terrain!.codeInsee).toBeUndefined();
    expect(centreMaison(s)).toEqual({ x: 0, y: 0 });
    expect(coinsOrthophoto({ ...s, terrain: { ...s.terrain!, georef: undefined } })).toBeNull();
  });

  it('déplacer et pivoter la parcelle : la maison reste, le Lambert-93 suit', () => {
    const s = ok(implanterParcelle(maison(), PARCELLE));
    const coin = (x: Scene) =>
      planVersL93(x.terrain!.parcelle[0]!, x.terrain!.georef!, x.orientationNord);
    const d = ok(ajusterImplantation(s, { decalage: { x: 1_000, y: -500 } }));
    expect(d.terrain!.parcelle[0]).toEqual({
      x: s.terrain!.parcelle[0]!.x + 1_000,
      y: s.terrain!.parcelle[0]!.y - 500,
    });
    expect(coin(d)).toEqual(PARCELLE.contour[0]); // le coin réel n'a pas bougé
    const r = ok(ajusterImplantation(s, { rotation: 900 }));
    expect(r.orientationNord).toBe(900);
    const c = centreMaison(s);
    const p0 = s.terrain!.parcelle[0]!;
    // Rotation horaire de 90° autour du centre de la maison (y vers le bas).
    expect(r.terrain!.parcelle[0]).toEqual({ x: c.x - (p0.y - c.y), y: c.y + (p0.x - c.x) });
    expect(Math.abs(coin(r).x - PARCELLE.contour[0]!.x)).toBeLessThanOrEqual(2);
    expect(ok(ajusterImplantation(r, { rotation: -1800 })).orientationNord).toBe(2700);
  });

  it('parcelle dessinée à la main : elle se déplace aussi, sans géoréférence', () => {
    const s = ok(definirParcelle(maison(), { x: -5_000, y: -5_000 }, { x: 20_000, y: 20_000 }));
    const d = ok(ajusterImplantation(s, { decalage: { x: 100, y: 0 } }));
    expect(d.terrain!.parcelle[0]!.x).toBe(s.terrain!.parcelle[0]!.x + 100);
    expect(d.terrain!.georef).toBeUndefined();
    expect(ajusterImplantation(maison(), { rotation: 10 }).ok).toBe(false);
    expect(ajusterImplantation(s, { decalage: { x: 990_000, y: 0 } }).ok).toBe(false);
  });

  it('distances de la maison aux limites : les plus courtes, côté par côté', () => {
    const s = ok(definirParcelle(maison(), { x: -2_000, y: -5_000 }, { x: 20_000, y: 30_000 }));
    const c = distancesAuxLimites(s);
    expect(c).toHaveLength(4);
    expect(c[0]!.d).toBe(2_000);
    expect(c.map((x) => x.d)).toEqual([...c.map((x) => x.d)].sort((a, b) => a - b));
    expect(distancesAuxLimites(maison())).toEqual([]);
    expect(
      distancesAuxLimites(
        ok(definirParcelle(nouvelleScene(ctx.nouvelId), { x: 0, y: 0 }, { x: 9_000, y: 9_000 })),
      ),
    ).toEqual([]);
  });

  it('lien de partage : ni position, ni photo, ni référence cadastrale, ni image importée', () => {
    const s = ok(implanterParcelle(maison(), PARCELLE));
    const p = sceneSansLocalisation({
      ...s,
      fondImage: {
        storagePath: 'x',
        mmPour1000Px: 1000,
        position: { x: 0, y: 0 },
        rotation: 0,
        opacite: 50,
        niveauId: s.niveaux[0]!.id,
      },
    });
    expect(p.terrain).toEqual({
      parcelle: s.terrain!.parcelle,
      implantation: s.terrain!.implantation,
    });
    expect(p.fondImage).toBeNull();
    expect(JSON.stringify(p)).not.toMatch(/01001|ortho|georef/);
    expect(sceneSansLocalisation(maison()).terrain).toBeNull();
  });
});
