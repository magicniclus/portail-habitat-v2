import { describe, expect, it } from 'vitest';
import type { Niveau, Ouverture } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { listeMenuiseries } from './listeMenuiseries';
import { menuiserie3D } from './menuiseries3d';
import {
  colorerMenuiseries,
  materiauDe,
  remplissageDe,
  versInterieur,
  zonesCoulissement,
} from './menuiseries';
import {
  CATALOGUE_OUVERTURES,
  GROUPES_OUVERTURES,
  modifierOuverture,
  poserOuverture,
} from './ouvertures';
const ctx = contexteTest();
// Maquette : murs de 30 cm, mur du haut de (150, 150) à (10 450, 150), intérieur côté y > 150.
const n = niveauMaquette(ctx);
const mur = n.murs[0]!;
const poser = (niv: Niveau, type: Ouverture['type'], centre: number) =>
  poserOuverture(niv, { murId: mur.id, type, centre }, ctx);
const cloison = (niv: Niveau, epaisseur: number): Niveau => ({
  ...niv,
  murs: niv.murs.map((m) => (m.id === mur.id ? { ...m, epaisseur } : m)),
});

describe('menuiseries : valeurs par défaut (DES-13, DES-14)', () => {
  it('portes pleines, fenêtres et baies vitrées, PVC blanc par défaut', () => {
    const o = (type: Ouverture['type']) => ({ ...ok(poser(n, type, 3000)).ouvertures[0]! });
    expect(remplissageDe(o('porte'))).toBe('plein');
    expect(remplissageDe(o('porte_entree'))).toBe('plein');
    expect(remplissageDe(o('fenetre'))).toBe('vitre');
    expect(remplissageDe(o('porte_fenetre'))).toBe('vitre');
    expect(remplissageDe({ ...o('porte'), remplissage: 'semi_vitre' })).toBe('semi_vitre');
    expect(materiauDe(o('fenetre'))).toBe('pvc');
    expect(versInterieur(n, mur, o('porte'))).toBe(1);
  });
});

describe('portes coulissantes (galandage, applique)', () => {
  it('galandage : rangement dans le mur du côté choisi, cloison de 72 mm au moins', () => {
    const avec = ok(poser(n, 'porte_galandage', 3000));
    const o = avec.ouvertures[0]!;
    expect(zonesCoulissement(o)).toEqual([[o.position - o.largeur, o.position]]);
    const droite = ok(modifierOuverture(avec, o.id, { sens: 'droite' })).ouvertures[0]!;
    expect(zonesCoulissement(droite)).toEqual([
      [o.position + o.largeur, o.position + 2 * o.largeur],
    ]);
    expect(poser(cloison(n, 70), 'porte_galandage', 3000)).toMatchObject({
      code: 'PRECONDITION',
      message: expect.stringMatching(/7,2 cm/),
    });
    // Double : la moitié de chaque côté.
    const dbl = ok(poser(n, 'porte_galandage_double', 5000)).ouvertures[0]!;
    expect(zonesCoulissement(dbl)).toEqual([
      [dbl.position - dbl.largeur / 2, dbl.position],
      [dbl.position + dbl.largeur, dbl.position + (3 * dbl.largeur) / 2],
    ]);
  });

  it('pas de place pour ranger : refus, ou pose du côté libre', () => {
    // Près de l'extrémité a : la poche ne tient pas à gauche, la porte se range à droite.
    const avecPres = ok(poser(n, 'porte_galandage', 600));
    const pres = avecPres.ouvertures[0]!;
    expect(pres.sens).toBe('droite');
    expect(modifierOuverture(avecPres, pres.id, { sens: 'gauche' })).toMatchObject({
      code: 'PRECONDITION',
      message: expect.stringMatching(/ranger/),
    });
    // Une fenêtre dans la poche d'une porte à galandage : refusée, et l'inverse aussi.
    const porte = ok(poser(n, 'porte_galandage', 3000));
    const o = porte.ouvertures[0]!;
    expect(poser(porte, 'fenetre', o.position - o.largeur / 2)).toMatchObject({
      code: 'PRECONDITION',
    });
    // Fenêtres des deux côtés : plus de place nulle part.
    const fenetres = ok(poser(ok(poser(n, 'fenetre', 2000)), 'fenetre', 4300));
    expect(poser(fenetres, 'porte_galandage', 3150)).toMatchObject({ code: 'PRECONDITION' });
    // En applique : même place nécessaire sur le mur, cloison fine acceptée.
    const applique = ok(poser(cloison(n, 50), 'porte_coulissante', 3000)).ouvertures[0]!;
    expect(zonesCoulissement(applique)).toHaveLength(1);
    expect(zonesCoulissement({ ...applique, type: 'baie_coulissante' })).toEqual([]);
  });
});

describe('liste des menuiseries (chiffrage)', () => {
  it('une ligne par modèle identique, avec le nombre', () => {
    let m = ok(poser(n, 'fenetre', 2000));
    m = ok(poser(m, 'fenetre', 5000));
    m = ok(poser(m, 'porte', 8000));
    const id = m.ouvertures[2]!.id;
    m = ok(
      modifierOuverture(m, id, {
        remplissage: 'vitre',
        petitsBois: { colonnes: 2, rangees: 3 },
        materiau: 'bois',
        imposte: 'fixe',
        volet: 'battant',
      }),
    );
    m = ok(poser(m, 'ouverture_libre', 9500));
    expect(listeMenuiseries(m)).toEqual([
      { libelle: 'Fenêtre 80 × 125 cm, vitré, PVC', nombre: 2 },
      {
        libelle: 'Porte 83 × 204 cm, vitré, 6 carreaux, Bois, avec imposte, volet battant',
        nombre: 1,
      },
    ]);
  });
});

describe('menuiseries en 3D', () => {
  const pieces = (type: Ouverture['type'], extra: Partial<Ouverture> = {}, ouvert = 0) => {
    const avec = ok(poser(n, type, 4000));
    const o = { ...avec.ouvertures[0]!, ...extra };
    return menuiserie3D(o, mur, avec, ouvert);
  };
  const de = (p: ReturnType<typeof pieces>, m: string) => p.filter((x) => x.matiere === m);

  it('porte pleine : dormant, panneau, poignée ; vitrée : verre et petits bois', () => {
    const pleine = pieces('porte');
    expect(de(pleine, 'cadre').length).toBeGreaterThanOrEqual(3);
    expect(de(pleine, 'panneau')).toHaveLength(1);
    expect(de(pleine, 'verre')).toHaveLength(0);
    expect(de(pleine, 'poignee')).toHaveLength(1);
    const vitree = pieces('porte', {
      remplissage: 'vitre',
      petitsBois: { colonnes: 2, rangees: 3 },
    });
    expect(de(vitree, 'verre')).toHaveLength(1);
    // 1 montant + 2 traverses de petits bois.
    expect(de(vitree, 'petit_bois')).toHaveLength(3);
    const semi = pieces('porte', { remplissage: 'semi_vitre' });
    expect(de(semi, 'verre')).toHaveLength(1);
    expect(de(semi, 'panneau')).toHaveLength(1);
    expect(de(pieces('porte', { remplissage: 'cassettes' }), 'panneau').length).toBeGreaterThan(1);
  });

  it('fenêtre double, imposte, volets, seuil ; fenêtre fixe sans poignée ; ouverture libre vide', () => {
    expect(de(pieces('fenetre_double'), 'verre')).toHaveLength(2);
    expect(de(pieces('fenetre_fixe'), 'poignee')).toHaveLength(0);
    expect(de(pieces('porte', { imposte: 'fixe' }), 'verre')).toHaveLength(1);
    expect(de(pieces('fenetre', { volet: 'roulant' }), 'volet')).toHaveLength(1);
    expect(de(pieces('fenetre_double', { volet: 'battant' }), 'volet')).toHaveLength(2);
    expect(de(pieces('porte_fenetre'), 'seuil')).toHaveLength(1);
    expect(pieces('ouverture_libre')).toEqual([]);
  });

  it('ouverte : battant pivoté vers la pièce, coulissant déplacé, applique sur son rail', () => {
    const vantail = (p: ReturnType<typeof pieces>) => de(p, 'panneau')[0]!;
    const fermee = vantail(pieces('porte'));
    const ouverte = vantail(pieces('porte', {}, 1));
    expect(ouverte.angle).not.toBeCloseTo(fermee.angle, 3);
    // Intérieur côté y > 150 : le vantail ouvert est dans la pièce.
    expect(ouverte.centre.y).toBeGreaterThan(fermee.centre.y + 100);
    const g0 = vantail(pieces('porte_galandage'));
    const g1 = vantail(pieces('porte_galandage', {}, 1));
    expect(g1.centre.y).toBeCloseTo(g0.centre.y, 3);
    expect(Math.abs(g1.centre.x - g0.centre.x)).toBeGreaterThan(500);
    const applique = pieces('porte_coulissante');
    expect(de(applique, 'rail')).toHaveLength(1);
    expect(Math.abs(vantail(applique).centre.y - 150)).toBeGreaterThan(150);
  });
});

describe('couleur de toutes les menuiseries', () => {
  it('portes et fenêtres colorées, ouverture libre inchangée ; couleur illisible refusée', () => {
    let niv = ok(poser(n, 'porte', 2_000));
    niv = ok(poser(niv, 'fenetre', 5_000));
    niv = ok(poser(niv, 'ouverture_libre', 8_000));
    const c = ok(colorerMenuiseries(niv, '#5B3A24'));
    expect(c.ouvertures.map((o) => o.couleur)).toEqual(['#5b3a24', '#5b3a24', undefined]);
    expect(colorerMenuiseries(niv, 'marron')).toMatchObject({ code: 'ENTREE_INVALIDE' });
    expect(colorerMenuiseries(n, '#ffffff')).toMatchObject({ code: 'PRECONDITION' });
  });
});

describe('menu Portes & fenêtres', () => {
  it('sous-sections : chaque type du catalogue figure une fois et une seule', () => {
    const tous = GROUPES_OUVERTURES.flatMap((g) => g.types);
    expect([...tous].sort()).toEqual(Object.keys(CATALOGUE_OUVERTURES).sort());
  });
});
