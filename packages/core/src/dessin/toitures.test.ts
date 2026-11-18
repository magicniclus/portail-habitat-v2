import { describe, expect, it } from 'vitest';
import { toiture as schemaToiture, type Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette } from './aidesTest';
import {
  ajouterElementToit,
  definirToiture,
  modifierToiture,
  quantitesToiture,
  retirerElementToit,
} from './commandesToit';
import { metreNiveau } from './metre';
import { toit3D } from './toits3d';
import {
  aire3D,
  empriseToit,
  hauteurLocale,
  surfaceCarrezCombles,
  type Toiture,
  type TypeToiture,
} from './toitures';

// Maquette : 10,60 × 8,60 m hors tout, murs de 30 cm et 2,50 m de haut.
const n = niveauMaquette(contexteTest());
const toit = (type: TypeToiture, degres = 45, extra: Partial<Toiture> = {}): Niveau => ({
  ...n,
  toiture: schemaToiture.parse({ type, pentes: [degres * 10], debord: 0, ...extra }),
});

describe('toiture (DES-16, DES-17)', () => {
  it('emprise aux murs dans le sens du faîtage, débords en plus', () => {
    const e = empriseToit(
      toit('deux_pans', 45, { debord: 500 }),
      toit('deux_pans', 45, { debord: 500 }).toiture!,
    )!;
    expect(e).toMatchObject({
      L0: 10_600,
      P0: 8_600,
      L: 11_600,
      P: 9_600,
      base: 2_500,
      hMurs: 2_500,
    });
    const tourne = toit('deux_pans', 45, { faitageAngle: 900 });
    expect(empriseToit(tourne, tourne.toiture!)).toMatchObject({ L0: 8_600, P0: 10_600 });
    expect(empriseToit({ ...n, murs: [] }, tourne.toiture!)).toBeNull();
  });

  it('deux pans à 45° : faîtage à 4,30 m au-dessus des murs, 2 pans, 2 pignons, 2 gouttières', () => {
    const t = toit3D(toit('deux_pans'))!;
    expect(t.pans).toHaveLength(2);
    expect(t.murs).toHaveLength(2);
    expect(t.gouttieres).toHaveLength(2);
    expect(Math.max(...t.pans.flat().map((p) => p.z))).toBeCloseTo(2_500 + 4_300, 0);
    // 2 × 10,60 m × (4,30 / cos 45°) = 128,9 m².
    expect(t.surface / 1e6).toBeCloseTo((2 * 10.6 * 4.3) / Math.cos(Math.PI / 4), 1);
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
    expect(compte('plate')).toEqual([1, 4, 0]);
    expect(compte('mansarde')).toEqual([4, 2, 2]);
    expect(toit3D(n)).toBeNull();
    expect(toit3D({ ...toit('plate'), murs: [] })).toBeNull();
  });

  it('hauteurs : quatre pans plus bas aux bouts, mansarde avec brisis raide, plat à zéro', () => {
    const t = toit('quatre_pans', 45).toiture!;
    const e = { L0: 10_600, P0: 8_600 };
    expect(hauteurLocale(t, e, 0, 0)).toBeCloseTo(4_300, 0);
    expect(hauteurLocale(t, e, 5_000, 0)).toBeCloseTo(300, 0);
    const m = toit('mansarde', 20).toiture!;
    // Brisis à 70° sur 18 % de la profondeur : plus raide que le terrasson.
    expect(hauteurLocale(m, e, 0, -4_300 + 500)).toBeCloseTo(
      500 * Math.tan((70 * Math.PI) / 180),
      0,
    );
    expect(hauteurLocale(toit('plate').toiture!, e, 0, 0)).toBe(0);
    expect(hauteurLocale(toit('croupe', 45).toiture!, e, 5_000, 0)).toBeCloseTo(600, 0);
    expect(hauteurLocale(toit('monopente', 45).toiture!, e, 0, 4_300)).toBeCloseTo(8_600, 0);
  });

  it('combles Carrez : surface où l’on tient à 1,80 m', () => {
    // Murs de 2,50 m : tout le rectangle compte.
    const haut = toit('deux_pans', 45);
    const e = empriseToit(haut, haut.toiture!)!;
    expect(surfaceCarrezCombles(haut.toiture!, e)).toBe(10_600 * 8_600);
    // Murs de 50 cm, deux pans à 45° : 1,80 m atteint à 1,30 m des façades (8,60 − 2,60 = 6 m).
    const bas = { ...haut, murs: haut.murs.map((m) => ({ ...m, hauteur: 500 })) };
    const eb = empriseToit(bas, bas.toiture!)!;
    expect(surfaceCarrezCombles(bas.toiture!, eb) / 1e6).toBeCloseTo(10.6 * 6, 0);
  });

  it('fenêtre de toit inclinée comme le pan, cheminée au-dessus du faîtage, lucarne', () => {
    const avec = toit('deux_pans', 45, {
      fenetresToit: [
        { id: 'ft_0001', pan: 0, position: { x: 5300, y: 2000 }, largeur: 780, hauteur: 980 },
      ],
      cheminees: [{ id: 'ch_0001', position: { x: 3000, y: 4300 }, largeur: 500, profondeur: 500 }],
      lucarnes: [
        { id: 'l_0001', type: 'jacobine', pan: 1, position: { x: 7000, y: 6500 }, largeur: 1200 },
      ],
    });
    const t = toit3D(avec)!;
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

describe('commandes de toiture et métré', () => {
  const ctx = contexteTest();
  const ok = <T>(r: { ok: true; data: T } | { ok: false; message: string }): T => {
    if (!r.ok) throw new Error(r.message);
    return r.data;
  };

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
