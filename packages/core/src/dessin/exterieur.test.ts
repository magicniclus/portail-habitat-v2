import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette } from './aidesTest';
import {
  ajouterAllee,
  ajouterPiscine,
  ajouterTerrasse,
  ajouterVegetal,
  contourPiscine,
  definirParcelle,
  distanceAuxLimites,
  LIBELLES_FORME_PISCINE,
  marchesTerrasse,
  modifierExterieur,
  parcelleAutour,
  supprimerExterieur,
  tracerCloture,
  volumeEau,
  type FormePiscine,
} from './exterieur';
import { aire } from './geometrie';
import { metreNiveau } from './metre';
import { nouvelleScene } from './migrations';

const ok = <T>(r: { ok: true; data: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message);
  return r.data;
};
const ctx = contexteTest();
const n = niveauMaquette(ctx);

describe('piscine (DES-20)', () => {
  it('formes, volume d’eau, rotation', () => {
    const p = ok(ajouterPiscine(n, { x: 5_000, y: 14_000 }, 'rectangle', ctx)).exterieur
      .piscines[0]!;
    expect(p).toMatchObject({ longueur: 8_000, largeur: 4_000, escalier: 'roman' });
    // 8 × 4 m, profondeur moyenne 1,45 m : 46 400 litres.
    expect(volumeEau(p)).toBe(46_400);
    for (const forme of Object.keys(LIBELLES_FORME_PISCINE) as FormePiscine[]) {
      const q = ok(ajouterPiscine(n, { x: 0, y: 0 }, forme, ctx)).exterieur.piscines[0]!;
      expect(aire(contourPiscine(q))).toBeGreaterThan(0);
      expect(aire(contourPiscine(q))).toBeLessThanOrEqual(q.longueur * q.largeur + 1);
    }
    const tourne = contourPiscine({ ...p, rotation: 900 });
    expect(Math.max(...tourne.map((c) => c.y)) - Math.min(...tourne.map((c) => c.y))).toBe(8_000);
    // Haricot plus petit que l'ovale qui l'englobe ; L = 3/4 du rectangle.
    const ov = { ...p, forme: 'ovale' as const };
    expect(aire(contourPiscine({ ...ov, forme: 'haricot' }))).toBeLessThan(
      aire(contourPiscine(ov)),
    );
    expect(aire(contourPiscine({ ...p, forme: 'L' }))).toBe(0.75 * 8_000 * 4_000);
  });

  it('distance aux limites (indicatif), réglages vérifiés, 5 piscines au plus', () => {
    const s = ok(
      definirParcelle(
        nouvelleScene(ctx.nouvelId),
        { x: -10_000, y: -10_000 },
        { x: 30_000, y: 30_000 },
      ),
    );
    const p = ok(ajouterPiscine(n, { x: 5_000, y: 26_000 }, 'rectangle', ctx)).exterieur
      .piscines[0]!;
    expect(distanceAuxLimites(contourPiscine(p), s.terrain!.parcelle)).toBe(2_000);
    const avec = ok(ajouterPiscine(n, { x: 5_000, y: 20_000 }, 'rectangle', ctx));
    const id = avec.exterieur.piscines[0]!.id;
    expect(
      ok(modifierExterieur(avec, 'piscine', id, { longueur: 10_000 })).exterieur.piscines[0]!
        .longueur,
    ).toBe(10_000);
    expect(
      modifierExterieur(avec, 'piscine', id, { profondeurMin: 2_000, profondeurMax: 1_000 }),
    ).toMatchObject({ code: 'ENTREE_INVALIDE' });
    expect(modifierExterieur(avec, 'piscine', 'pi_absent', {})).toMatchObject({
      code: 'INTROUVABLE',
    });
    let m = n;
    for (let i = 0; i < 5; i++) m = ok(ajouterPiscine(m, { x: 0, y: i * 10_000 }, 'ronde', ctx));
    expect(ajouterPiscine(m, { x: 0, y: 0 }, 'ronde', ctx)).toMatchObject({ code: 'PRECONDITION' });
  });
});

describe('terrasse, allées, clôtures, végétation, parcelle (DES-18, DES-19)', () => {
  it('terrasse rectangulaire, surélevée avec marches, métré', () => {
    const avec = ok(ajouterTerrasse(n, { x: 0, y: 9_000 }, { x: 6_000, y: 12_000 }, ctx));
    const t = avec.exterieur.terrasses[0]!;
    // Le niveau garde son identifiant ; celui de la terrasse est rendu à part.
    expect(avec.id).toBe(n.id);
    expect(avec.elementId).toBe(t.id);
    expect(aire(t.contour)).toBe(18e6);
    expect(marchesTerrasse(t)).toBeNull();
    const haute = ok(
      modifierExterieur(avec, 'terrasse', t.id, { hauteur: 600, gardeCorps: true, pergola: true }),
    );
    expect(marchesTerrasse(haute.exterieur.terrasses[0]!)).toMatchObject({
      nombre: 3,
      hauteur: 150,
    });
    expect(metreNiveau(haute).find((l) => l.poste === 'terrasse')).toMatchObject({
      quantite: 18e6,
      prestationId: 'terrasse',
    });
    expect(ajouterTerrasse(n, { x: 0, y: 0 }, { x: 100, y: 5_000 }, ctx)).toMatchObject({
      code: 'PRECONDITION',
    });
  });

  it('allées, clôture tracée en plusieurs tronçons, végétaux, suppression', () => {
    let m = ok(ajouterAllee(n, { x: 0, y: 9_000 }, { x: 1_200, y: 15_000 }));
    expect(ajouterAllee(n, { x: 0, y: 0 }, { x: 0, y: 10 })).toMatchObject({
      code: 'PRECONDITION',
    });
    const c1 = ok(
      tracerCloture(
        m,
        { a: { x: -5_000, y: -5_000 }, b: { x: 15_000, y: -5_000 }, type: 'bois' },
        ctx,
      ),
    );
    const c2 = ok(
      tracerCloture(
        c1,
        {
          id: c1.elementId,
          a: { x: 15_000, y: -5_000 },
          b: { x: 15_000, y: 15_000 },
          type: 'bois',
        },
        ctx,
      ),
    );
    expect(c2.exterieur.clotures).toHaveLength(1);
    expect(c2.exterieur.clotures[0]).toMatchObject({ points: [{}, {}, {}], hauteur: 1_800 });
    expect(
      tracerCloture(c2, { a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, type: 'muret' }, ctx),
    ).toMatchObject({ code: 'PRECONDITION' });
    m = ok(ajouterVegetal(c2, { x: 12_000, y: 12_000 }, 'arbre', ctx));
    expect(m.exterieur.vegetation[0]).toMatchObject({ type: 'arbre', diametre: 6_000 });
    // Métré : clôtures en mètres linéaires.
    expect(metreNiveau(m).find((l) => l.poste === 'clotures')).toMatchObject({
      quantite: 40_000,
      prestationId: 'cloture',
    });
    const vid = m.exterieur.vegetation[0]!.id;
    expect(ok(supprimerExterieur(m, 'vegetal', vid)).exterieur.vegetation).toHaveLength(0);
    expect(ok(supprimerExterieur(m, 'allee', '0')).exterieur.allees).toHaveLength(0);
    expect(supprimerExterieur(m, 'allee', '7')).toMatchObject({ code: 'INTROUVABLE' });
    expect(supprimerExterieur(m, 'cloture', 'cl_absent')).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('parcelle tracée ou autour de la maison', () => {
    const vide = nouvelleScene(ctx.nouvelId);
    expect(parcelleAutour(vide)).toMatchObject({ code: 'PRECONDITION' });
    const s = ok(parcelleAutour({ ...vide, niveaux: [n] }));
    const xs = s.terrain!.parcelle.map((p) => p.x);
    expect(Math.min(...xs)).toBe(150 - 8_000);
    expect(definirParcelle(vide, { x: 0, y: 0 }, { x: 10, y: 10 })).toMatchObject({
      code: 'PRECONDITION',
    });
  });
});

describe('extérieur : limites et réglages', () => {
  it('limites atteintes, réglages de chaque genre, parcelle redéfinie', () => {
    let m = n;
    for (let i = 0; i < 50; i++)
      m = ok(ajouterAllee(m, { x: i * 1_000, y: 0 }, { x: i * 1_000 + 500, y: 500 }));
    expect(ajouterAllee(m, { x: 0, y: 0 }, { x: 900, y: 900 })).toMatchObject({
      code: 'PRECONDITION',
    });
    let v = n;
    for (let i = 0; i < 500; i++) v = ok(ajouterVegetal(v, { x: i, y: 0 }, 'arbuste', ctx));
    expect(ajouterVegetal(v, { x: 0, y: 0 }, 'arbre', ctx)).toMatchObject({ code: 'PRECONDITION' });
    let c = ok(
      tracerCloture(n, { a: { x: 0, y: 0 }, b: { x: 1_000, y: 0 }, type: 'grillage' }, ctx),
    );
    for (let i = 2; i < 200; i++)
      c = ok(
        tracerCloture(
          c,
          { id: c.elementId, a: { x: 0, y: 0 }, b: { x: i * 1_000, y: 0 }, type: 'grillage' },
          ctx,
        ),
      );
    expect(
      tracerCloture(
        c,
        { id: c.elementId, a: { x: 0, y: 0 }, b: { x: 900_000, y: 0 }, type: 'grillage' },
        ctx,
      ),
    ).toMatchObject({ code: 'PRECONDITION' });
    const cl = c.exterieur.clotures[0]!;
    expect(
      ok(modifierExterieur(c, 'cloture', cl.id, { type: 'muret', hauteur: 800 })).exterieur
        .clotures[0],
    ).toMatchObject({ type: 'muret' });
    const ve = ok(ajouterVegetal(n, { x: 0, y: 0 }, 'haie', ctx));
    expect(
      ok(modifierExterieur(ve, 'vegetal', ve.elementId, { diametre: 1_000 })).exterieur
        .vegetation[0]!.diametre,
    ).toBe(1_000);
    expect(supprimerExterieur(ve, 'terrasse', 'te_absent')).toMatchObject({ code: 'INTROUVABLE' });
    expect(supprimerExterieur(ve, 'allee', 'x')).toMatchObject({ code: 'INTROUVABLE' });
    // Hors-sol et couloir : rectangles ; sans maison donnée, marches sur le premier côté.
    for (const forme of ['hors_sol', 'couloir'] as const) {
      const p = ok(ajouterPiscine(n, { x: 0, y: 0 }, forme, ctx)).exterieur.piscines[0]!;
      expect(contourPiscine(p)).toHaveLength(4);
    }
    const s = ok(
      definirParcelle(nouvelleScene(ctx.nouvelId), { x: 0, y: 0 }, { x: 5_000, y: 5_000 }),
    );
    const s2 = ok(definirParcelle(s, { x: 0, y: 0 }, { x: 9_000, y: 9_000 }));
    expect(s2.terrain!.parcelle[2]).toEqual({ x: 9_000, y: 9_000 });
  });
});
