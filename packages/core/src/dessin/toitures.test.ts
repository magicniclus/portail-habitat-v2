import { describe, expect, it } from 'vitest';
import {
  niveau as schemaNiveau,
  toiture as schemaToiture,
  type Niveau,
} from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import {
  ajouterElementToit,
  definirToiture,
  modifierToiture,
  quantitesToiture,
  reglerHauteursToit,
  reglerPartieToit,
  retirerElementToit,
  toitureAutomatique,
} from './commandesToit';
import { nouvelleScene } from './migrations';
import { ajouterNiveau } from './niveaux';
import { metreNiveau } from './metre';
import { toit3D } from './toits3d';
import {
  aire3D,
  altitudeToit,
  versMonde,
  emprisesToit,
  hauteurLocale,
  type Emprise,
  type Toiture,
  type TypeToiture,
} from './toitures';
import { mursDepuisForme, type Forme } from './formes';
import { detecterPieces, synchroniserPieces } from './pieces';

// Maquette : 10,60 × 8,60 m hors tout, murs de 30 cm et 2,50 m de haut.
const ctxF = contexteTest();
const n = niveauMaquette(contexteTest());
const toit = (type: TypeToiture, degres = 45, extra: Partial<Toiture> = {}): Niveau => ({
  ...n,
  toiture: schemaToiture.parse({ type, pentes: [degres * 10], debord: 0, ...extra }),
});

describe('toiture (DES-16, DES-17)', () => {
  it('aile unique : dimensions aux murs, débords sur les côtés extérieurs, faîtage tournable', () => {
    const e = emprisesToit(toit('deux_pans', 45, { debord: 500 }))[0]!;
    expect(e).toMatchObject({ L0: 10_600, P0: 8_600, base: 2_500, hMurs: 2_500 });
    expect([e.aMin, e.aMax, e.bMin, e.bMax]).toEqual([-5_800, 5_800, -4_800, 4_800]);
    expect(emprisesToit(toit('deux_pans', 45, { faitageAngle: 900 }))[0]).toMatchObject({
      L0: 8_600,
      P0: 10_600,
    });
    expect(emprisesToit({ ...toit('plate'), murs: [] })[0]).toBeUndefined();
  });

  it('deux pans à 45° : faîtage à 4,30 m au-dessus des murs, 2 pans, 2 pignons, 2 gouttières', () => {
    const t = toit3D(toit('deux_pans'))!;
    expect(t.pans).toHaveLength(2);
    expect(t.murs).toHaveLength(2);
    expect(t.gouttieres).toHaveLength(2);
    expect(t).toMatchObject({ egout: 2_500, faitage: 2_500 + 4_300 });
    // 2 × 10,60 m × (4,30 / cos 45°) = 128,9 m².
    expect(t.surface / 1e6).toBeCloseTo((2 * 10.6 * 4.3) / Math.cos(Math.PI / 4), 0);
    expect(t.longueurGouttieres).toBe(2 * 10_600);
  });

  it('chaque type a ses pans, ses murs, ses gouttières', () => {
    const compte = (type: TypeToiture) => {
      const t = toit3D(toit(type, 30))!;
      return [t.pans.length, t.murs.length, t.gouttieres.length];
    };
    expect(compte('quatre_pans')).toEqual([4, 0, 4]);
    expect(compte('croupe')).toEqual([4, 0, 4]);
    expect(compte('monopente')).toEqual([1, 3, 1]);
    // Toit plat : 4 acrotères sur les murs extérieurs (4 côtés et un dessus chacun), sans gouttière.
    expect(compte('plate')).toEqual([1, 20, 0]);
    expect(compte('mansarde')).toEqual([4, 2, 2]);
    expect(toit3D(n)).toBeNull();
    expect(toit3D({ ...toit('plate'), murs: [] })).toBeNull();
  });

  it('hauteurs : quatre pans plus bas aux bouts, mansarde avec brisis raide, plat à zéro', () => {
    const t = toit('quatre_pans', 45).toiture!;
    const e = { L0: 10_600, P0: 8_600 };
    expect(hauteurLocale(t, e, 0, 0)).toBeCloseTo(4_300, 0);
    expect(hauteurLocale(t, e, 5_000, 0)).toBeCloseTo(300, 0);
    // Contre une autre aile, pas de croupe : le faîtage file jusqu'au bout.
    const cotes = { a0: 'exterieur', a1: 'interieur', b0: 'exterieur', b1: 'exterieur' } as const;
    expect(hauteurLocale(t, { ...e, cotes }, 5_000, 0)).toBeCloseTo(4_300, 0);
    const m = toit('mansarde', 20).toiture!;
    expect(hauteurLocale(m, e, 0, -4_300 + 500)).toBeCloseTo(
      500 * Math.tan((70 * Math.PI) / 180),
      0,
    );
    expect(hauteurLocale(toit('plate').toiture!, e, 0, 0)).toBe(0);
    expect(hauteurLocale(toit('croupe', 45).toiture!, e, 5_000, 0)).toBeCloseTo(600, 0);
    expect(hauteurLocale(toit('monopente', 45).toiture!, e, 0, 4_300)).toBeCloseTo(8_600, 0);
    expect(
      hauteurLocale(toit('monopente', 45).toiture!, { ...e, sens: -1 }, 0, -4_300),
    ).toBeCloseTo(8_600, 0);
  });

  it('combles Carrez : surface où l’on tient à 1,80 m', () => {
    // Murs de 2,50 m : tout le rectangle compte.
    expect(toit3D(toit('deux_pans', 45))!.carrez / 1e6).toBeCloseTo(10.6 * 8.6, 0);
    // Murs de 50 cm, deux pans à 45° : 1,80 m atteint à 1,30 m des façades (8,60 − 2,60 = 6 m).
    const haut = toit('deux_pans', 45);
    const bas = { ...haut, murs: haut.murs.map((m) => ({ ...m, hauteur: 500 })) };
    expect(toit3D(bas)!.carrez / 1e6).toBeCloseTo(10.6 * 6, 0);
  });

  it('fenêtre de toit inclinée comme le pan, cheminée au-dessus du faîtage, lucarne', () => {
    const avec = toit('deux_pans', 45, {
      fenetresToit: [
        { id: 'ft_0001', pan: 0, position: { x: 5300, y: 2000 }, largeur: 780, hauteur: 980 },
        { id: 'ft_0002', pan: 0, position: { x: 50_000, y: 0 }, largeur: 780, hauteur: 980 },
      ],
      cheminees: [{ id: 'ch_0001', position: { x: 3000, y: 4300 }, largeur: 500, profondeur: 500 }],
      lucarnes: [
        { id: 'l_0001', type: 'jacobine', pan: 1, position: { x: 7000, y: 6500 }, largeur: 1200 },
      ],
    });
    const t = toit3D(avec)!;
    // Un élément hors du toit (plan modifié depuis) n'est pas dessiné.
    expect(t.fenetres).toHaveLength(1);
    expect(t.fenetres[0]!.inclinaison).toBeCloseTo(Math.PI / 4, 2);
    const c = t.cheminees[0]!;
    expect(c.centre.z + c.taille.h / 2).toBeCloseTo(2_500 + 4_300 + 600, 0);
    expect(t.lucarnes).toHaveLength(1);
    expect(
      aire3D([
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 1000 },
      ]),
    ).toBe(500_000);
  });
});

describe('toits en L, T, U et sur une partie sans étage', () => {
  const forme = (f: Forme): Niveau => {
    const r = mursDepuisForme(f, { epaisseur: 200, hauteur: 2_500, nouvelId: ctxF.nouvelId });
    if (!r.ok) throw new Error(r.message);
    const vide = schemaNiveau.parse({ id: 'n_rdc0', nom: 'RDC', type: 'rdc', altitude: 0 });
    return {
      ...vide,
      murs: r.data,
      pieces: synchroniserPieces([], detecterPieces(r.data), () => ctxF.nouvelId('p')),
    };
  };
  const avecToit = (niv: Niveau, type: TypeToiture = 'deux_pans'): Niveau => ({
    ...niv,
    toiture: schemaToiture.parse({ type, pentes: [450], debord: 0 }),
  });
  const decoupe = { largeur: 4_000, profondeur: 3_000 };

  it('L : deux ailes, la plus étroite s’arrête au faîtage de la plus large (noue)', () => {
    const toitL = avecToit(forme({ forme: 'L', largeur: 10_600, profondeur: 8_600, decoupe }));
    const t = toit3D(toitL)!;
    expect(t.ailes).toHaveLength(2);
    expect(t.ailes.filter((e) => Object.values(e.cotes).includes('interieur'))).toHaveLength(1);
    // Pignons : 2 sur l'aile principale, 1 au bout libre de l'aile secondaire.
    expect(t.murs).toHaveLength(3);
    // Faîtage le plus haut : aile de 6,60 m de large à 45° → 3,30 m au-dessus des murs.
    expect(t.faitage).toBe(2_500 + 3_300);
    // Toits réunis : la surface des pans visibles égale la couverture mesurée, et aucun
    // morceau de pan ne passe sous le toit d'une autre aile (plus de débord devant un pignon).
    const somme = t.pans.reduce((s, p) => s + aire3D(p), 0);
    expect(Math.abs(somme - t.surface) / t.surface).toBeLessThan(0.01);
    for (const p of t.pans) {
      const c = {
        x: p.reduce((s, q) => s + q.x, 0) / p.length,
        y: p.reduce((s, q) => s + q.y, 0) / p.length,
        z: p.reduce((s, q) => s + q.z, 0) / p.length,
      };
      expect(altitudeToit(toitL.toiture!, t.ailes, c)!.z).toBeLessThanOrEqual(c.z + 5);
    }
    // Gouttières à l'air libre seulement : 8,60 + 3,00 (creux) + 2 × 4,00 = 19,60 m.
    expect(t.longueurGouttieres / 1000).toBeCloseTo(19.6, 0);
    // Quatre pans en L : pas de croupe contre l'autre aile (aile secondaire sans pan de bout).
    const quatre = toit3D(
      avecToit(forme({ forme: 'L', largeur: 10_600, profondeur: 8_600, decoupe }), 'quatre_pans'),
    )!;
    const secondaire = quatre.ailes.find((e) => Object.values(e.cotes).includes('interieur'))!;
    const z = (a: number) => hauteurLocale(toitL.toiture!, { ...secondaire }, a, 0);
    expect(z(secondaire.aMin)).toBeCloseTo(z(0), 0);
  });

  it('toit toujours fermé : au bout de chaque faîtage, un pignon ou le toit d’une autre aile', () => {
    for (const f of ['L', 'U', 'T'] as const)
      for (const faitageAngle of [0, 900])
        for (const d of [decoupe, { largeur: 2_000, profondeur: 5_000 }]) {
          const niv = avecToit(forme({ forme: f, largeur: 10_600, profondeur: 8_600, decoupe: d }));
          niv.toiture = { ...niv.toiture!, faitageAngle };
          const t = toit3D(niv)!;
          for (const e of t.ailes) {
            if (e.type !== 'deux_pans') continue;
            for (const a of [-e.L0 / 2, e.L0 / 2]) {
              const p = versMonde(e, a, 0, hauteurLocale(niv.toiture!, e, a, 0));
              const autres = t.ailes.filter((o) => o !== e);
              const couvert = (altitudeToit(niv.toiture!, autres, p)?.z ?? -Infinity) >= p.z - 5;
              const pignon = t.murs.some((m) =>
                m.some((q) => Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) < 5),
              );
              expect(couvert || pignon, `${f} ${faitageAngle} ${d.largeur}`).toBe(true);
            }
          }
        }
  });

  it('réglage par partie : forme propre et faîtage tourné pour une seule aile', () => {
    const niv = avecToit(forme({ forme: 'L', largeur: 10_600, profondeur: 8_600, decoupe }));
    const [e1, e2] = toit3D(niv)!.ailes as [Emprise, Emprise];
    let m = ok(reglerPartieToit(niv, e2.cle, { type: 'quatre_pans' }));
    let ailes = toit3D(m)!.ailes;
    expect(ailes.find((e) => e.cle === e2.cle)!.type).toBe('quatre_pans');
    expect(ailes.find((e) => e.cle === e1.cle)!.type).toBe('deux_pans');
    m = ok(reglerPartieToit(m, e1.cle, { tourner: true }));
    ailes = toit3D(m)!.ailes;
    const tournee = ailes.find((e) => e.cle === e1.cle)!;
    expect([tournee.L0, tournee.P0]).toEqual([e1.P0, e1.L0]);
    // Retour au réglage commun : plus rien d'enregistré pour cette partie.
    m = ok(reglerPartieToit(m, e2.cle, { type: null }));
    expect(m.toiture!.parties).toEqual([{ cle: e1.cle, tourner: true }]);
    expect(reglerPartieToit({ ...m, toiture: null }, e1.cle, {}).ok).toBe(false);
  });

  it('U et T : trois ailes ; les gouttières cachées sous une autre aile ne comptent pas', () => {
    const u = toit3D(avecToit(forme({ forme: 'U', largeur: 10_600, profondeur: 8_600, decoupe })))!;
    expect(u.ailes).toHaveLength(3);
    const tt = toit3D(
      avecToit(
        forme({
          forme: 'T',
          largeur: 10_600,
          profondeur: 8_600,
          decoupe: { largeur: 3_000, profondeur: 4_000 },
        }),
      ),
    )!;
    expect(tt.ailes.length).toBeGreaterThanOrEqual(2);
    // Gouttières : jamais plus que le périmètre extérieur de la maison.
    expect(u.longueurGouttieres).toBeLessThanOrEqual(2 * (10_600 + 8_600) + 2 * 3_000);
  });

  it('étage sur une moitié : seule l’autre moitié est couverte, en appentis contre l’étage', () => {
    const rdc = avecToit(niveauMaquette(ctxF));
    const etage = {
      ...forme({ forme: 'rectangle', largeur: 5_300, profondeur: 8_600 }),
      id: 'n_etage1',
      altitude: 2_700,
    };
    const t = toit3D(rdc, etage)!;
    expect(t.ailes).toHaveLength(1);
    expect(t.ailes[0]!.type).toBe('monopente');
    // Le toit monte vers l'étage (x = 5 300) et descend vers la façade (x = 10 600).
    const ailes = t.ailes;
    const z = (x: number) => altitudeToit(rdc.toiture!, ailes, { x, y: 4_300 })!.z;
    expect(z(5_500)).toBeGreaterThan(z(10_000));
    expect(altitudeToit(rdc.toiture!, ailes, { x: 2_000, y: 4_300 })).toBeNull();
    // Sans mur haut (adossé à l'étage) : 2 joues latérales seulement.
    expect(t.murs).toHaveLength(2);
  });
});

describe('commandes de toiture et métré', () => {
  const ctx = contexteTest();

  it('créer, régler, poser et retirer des éléments, supprimer', () => {
    let m = ok(definirToiture(n, 'deux_pans'));
    expect(m.toiture).toMatchObject({
      type: 'deux_pans',
      pentes: [350],
      couverture: { famille: 'tuile' },
    });
    expect(ok(definirToiture(n, 'plate')).toiture!.couverture.famille).toBe('bac_acier');
    m = ok(modifierToiture(m, { pentes: [450], debord: 500, faitageAngle: 900 }));
    expect(m.toiture).toMatchObject({ pentes: [450], debord: 500, faitageAngle: 900 });
    expect(modifierToiture(m, { pentes: [1200] })).toMatchObject({ code: 'ENTREE_INVALIDE' });
    m = ok(ajouterElementToit(m, 'fenetre', { x: 3000, y: 3000 }, ctx));
    m = ok(ajouterElementToit(m, 'cheminee', { x: 5000, y: 4000 }, ctx));
    m = ok(ajouterElementToit(m, 'jacobine', { x: 7000, y: 6000 }, ctx));
    expect(m.toiture!.lucarnes[0]).toMatchObject({ type: 'jacobine', pan: 0 });
    expect(ajouterElementToit(m, 'fenetre', { x: 50_000, y: 0 }, ctx)).toMatchObject({
      code: 'PRECONDITION',
    });
    const id = m.toiture!.fenetresToit[0]!.id;
    expect(ok(retirerElementToit(m, id)).toiture!.fenetresToit).toHaveLength(0);
    expect(retirerElementToit(m, 'ft_absent')).toMatchObject({ code: 'INTROUVABLE' });
    expect(ok(definirToiture(m, null)).toiture).toBeNull();
    expect(definirToiture({ ...n, murs: [] }, 'plate')).toMatchObject({ code: 'PRECONDITION' });
    expect(modifierToiture(n, {})).toMatchObject({ code: 'INTROUVABLE' });
    expect(ajouterElementToit(n, 'fenetre', { x: 0, y: 0 }, ctx)).toMatchObject({
      code: 'INTROUVABLE',
    });
    expect(retirerElementToit(n, 'x')).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('métré : couverture, gouttières, fenêtres de toit ; combles Carrez ; toit plat en étanchéité', () => {
    let m = ok(definirToiture(n, 'deux_pans'));
    m = ok(ajouterElementToit(m, 'fenetre', { x: 3000, y: 3000 }, ctx));
    const lignes = metreNiveau(m);
    expect(lignes.find((l) => l.poste === 'couverture')).toMatchObject({
      unite: 'm2',
      prestationId: null,
    });
    expect(lignes.find((l) => l.poste === 'gouttieres')).toMatchObject({
      quantite: 2 * (10_600 + 800),
      prestationId: 'gouttieres',
    });
    expect(lignes.find((l) => l.poste === 'fenetres_toit')).toMatchObject({ quantite: 1 });
    expect(lignes.some((l) => l.poste === 'combles')).toBe(false);
    expect(metreNiveau({ ...m, type: 'combles' }).some((l) => l.poste === 'combles')).toBe(true);
    const plat = metreNiveau(ok(definirToiture(n, 'plate')));
    expect(plat.find((l) => l.poste === 'couverture')!.prestationId).toBe('etancheite');
    expect(quantitesToiture(n)).toBeNull();
  });
});

describe('toiture facile : automatique et par hauteurs', () => {
  const ctx = contexteTest();

  it('un clic : toit sur l’étage et appentis sur la partie basse ; sous-sol jamais couvert', () => {
    const rdc = { ...niveauMaquette(ctx), id: 'n_rdc0' };
    let scene = { ...nouvelleScene(ctx.nouvelId), niveaux: [rdc] };
    scene = ok(ajouterNiveau(scene, { type: 'etage', copierMurs: false }, ctx));
    const etageId = scene.niveaux.find((x) => x.type === 'etage')!.id;
    const r = mursDepuisForme(
      { forme: 'rectangle', largeur: 5_300, profondeur: 8_600 },
      { epaisseur: 200, hauteur: 2_500, nouvelId: ctx.nouvelId },
    );
    if (!r.ok) throw new Error(r.message);
    scene = {
      ...scene,
      niveaux: scene.niveaux.map((x) =>
        x.id === etageId
          ? {
              ...x,
              murs: r.data,
              pieces: synchroniserPieces([], detecterPieces(r.data), () => ctx.nouvelId('p')),
            }
          : x,
      ),
    };
    scene = ok(ajouterNiveau(scene, { type: 'sous_sol', copierMurs: true }, ctx));
    const auto = ok(toitureAutomatique(scene, 'deux_pans'));
    const parType = (t: string) => auto.niveaux.find((x) => x.type === t)!;
    expect(parType('etage').toiture?.type).toBe('deux_pans');
    expect(parType('rdc').toiture?.type).toBe('deux_pans');
    expect(toit3D(parType('rdc'), parType('etage'))!.ailes[0]!.type).toBe('monopente');
    expect(parType('sous_sol').toiture).toBeNull();
    // Étage qui couvre tout : le rez-de-chaussée n'a plus de toit.
    const plein = ok(
      ajouterNiveau(
        { ...nouvelleScene(ctx.nouvelId), niveaux: [rdc] },
        { type: 'etage', copierMurs: true },
        ctx,
      ),
    );
    const tout = ok(toitureAutomatique(plein, 'quatre_pans'));
    expect(tout.niveaux.find((x) => x.type === 'rdc')!.toiture).toBeNull();
    expect(
      toitureAutomatique({ ...scene, niveaux: [{ ...rdc, murs: [] }] }, 'plate'),
    ).toMatchObject({
      code: 'PRECONDITION',
    });
  });

  it('hauteurs depuis le sol : l’égout règle les murs, le faîtage règle la pente', () => {
    const m = ok(definirToiture(niveauMaquette(ctx), 'deux_pans'));
    const r = ok(reglerHauteursToit(m, { egout: 3_000, faitage: 7_000 }));
    expect(r.murs.every((x) => x.hauteur === 3_000)).toBe(true);
    expect(Math.abs(toit3D(r)!.faitage - 7_000)).toBeLessThan(20);
    // 4 m de haut pour 4,30 m de demi-largeur plus 40 cm de débord (surcroît compris) : ≈ 40°.
    expect(r.toiture!.pentes[0]! / 10).toBeCloseTo((Math.atan(4 / 4.7) * 180) / Math.PI, 0);
    expect(reglerHauteursToit(m, { faitage: 2_550 })).toMatchObject({ code: 'PRECONDITION' });
    expect(reglerHauteursToit(m, { egout: 100 })).toMatchObject({ code: 'PRECONDITION' });
    expect(reglerHauteursToit(niveauMaquette(ctx), { egout: 3_000 })).toMatchObject({
      code: 'INTROUVABLE',
    });
    // Toit plat : seul l'égout compte.
    const plat = ok(definirToiture(niveauMaquette(ctx), 'plate'));
    expect(ok(reglerHauteursToit(plat, { faitage: 9_000 })).toiture!.pentes).toEqual(
      plat.toiture!.pentes,
    );
  });
});

describe('surcroît : les débords ne descendent pas devant les fenêtres', () => {
  it('le bout du débord d’égout est au haut des murs ; une bande de mur ferme le dessous', () => {
    const n = ok(definirToiture(niveauMaquette(contexteTest()), 'deux_pans'));
    const t = toit3D(n)!;
    const egout = Math.min(...t.pans.flat().map((p) => p.z));
    expect(Math.abs(egout - t.egout)).toBeLessThan(2);
    expect(t.ailes[0]!.surcroit).toBeGreaterThan(200);
    // Deux pignons et deux bandes de surcroît le long des égouts.
    expect(t.murs).toHaveLength(4);
  });
});

describe('toits en L : variantes', () => {
  const c = contexteTest();
  const enL = (miroir = false): Niveau => {
    const r = mursDepuisForme(
      {
        forme: 'L',
        largeur: 10_600,
        profondeur: 8_600,
        decoupe: { largeur: 4_000, profondeur: 3_000 },
      },
      { epaisseur: 200, hauteur: 2_500, nouvelId: c.nouvelId },
    );
    if (!r.ok) throw new Error(r.message);
    const sym = (p: { x: number; y: number }) => (miroir ? { x: 10_600 - p.x, y: 8_600 - p.y } : p);
    const murs = r.data.map((m) => ({ ...m, a: sym(m.a), b: sym(m.b) }));
    const vide = schemaNiveau.parse({ id: 'n_rdc0', nom: 'RDC', type: 'rdc', altitude: 0 });
    return {
      ...vide,
      murs,
      pieces: synchroniserPieces([], detecterPieces(murs), () => c.nouvelId('p')),
    };
  };
  const avec = (niv: Niveau, type: TypeToiture, extra: Partial<Toiture> = {}) => ({
    ...niv,
    toiture: schemaToiture.parse({ type, pentes: [350], debord: 300, ...extra }),
  });

  it('toutes les formes sur un L, à l’endroit, en miroir et faîtage tourné', () => {
    for (const miroir of [false, true])
      for (const type of [
        'deux_pans',
        'quatre_pans',
        'croupe',
        'monopente',
        'plate',
        'mansarde',
      ] as const)
        for (const faitageAngle of [0, 900]) {
          const t = toit3D(avec(enL(miroir), type, { faitageAngle }))!;
          expect(t.ailes).toHaveLength(2);
          // Toit plat : sans débord (acrotères), un peu moins grand.
          expect(t.surface).toBeGreaterThan(type === 'plate' ? 75e6 : 80e6);
          expect(t.faitage).toBeGreaterThanOrEqual(t.egout);
        }
  });

  it('appentis du côté bas quand l’étage est à droite ; éléments hors du toit ignorés', () => {
    const rdc = avec(niveauMaquette(c), 'deux_pans', {
      cheminees: [{ id: 'ch_0009', position: { x: -9_000, y: 0 }, largeur: 500, profondeur: 500 }],
      lucarnes: [
        { id: 'l_0009', type: 'capucine', pan: 0, position: { x: -9_000, y: 0 }, largeur: 1_000 },
      ],
    });
    const r = mursDepuisForme(
      { forme: 'rectangle', largeur: 5_300, profondeur: 8_600 },
      { epaisseur: 200, hauteur: 2_500, nouvelId: c.nouvelId },
    );
    if (!r.ok) throw new Error(r.message);
    const decale = r.data.map((m) => ({
      ...m,
      a: { x: m.a.x + 5_300, y: m.a.y },
      b: { x: m.b.x + 5_300, y: m.b.y },
    }));
    const vide = schemaNiveau.parse({ id: 'n_et01', nom: 'Étage', type: 'etage', altitude: 2_700 });
    const etage = {
      ...vide,
      murs: decale,
      pieces: synchroniserPieces([], detecterPieces(decale), () => c.nouvelId('p')),
    };
    const t = toit3D(rdc, etage)!;
    expect(t.ailes[0]).toMatchObject({ type: 'monopente' });
    expect(t.cheminees).toEqual([]);
    expect(t.lucarnes).toEqual([]);
    const plat = toit3D({ ...rdc, toiture: { ...rdc.toiture!, type: 'plate' } }, etage)!;
    expect(plat.ailes[0]!.type).toBe('plate');
    expect(ajouterElementToit(rdc, 'capucine', { x: 8_000, y: 2_000 }, c)).toMatchObject({
      ok: true,
    });
  });
});
