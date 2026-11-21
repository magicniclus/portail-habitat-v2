import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { modifierLongueurMur } from './commandes';
import {
  calculerMarches,
  emprise,
  empriseLocale,
  LIBELLES_ESCALIER,
  longueurVolee,
  marchesDroites,
  modifierEscalier,
  poserEscalier,
  supprimerEscalier,
  type TypeEscalier,
} from './escaliers';
import {
  ECHELLE_DEFAUT,
  mettreFondAEchelle,
  poserFond,
  reglerFond,
  retirerFond,
  tailleFond,
} from './fond';
import { aire } from './geometrie';
import { nouvelleScene } from './migrations';
import {
  ajouterNiveau,
  hauteurVersLeHaut,
  niveauInferieur,
  niveauSuperieur,
  niveauxTries,
  renommerNiveau,
  supprimerNiveau,
  tremies,
} from './niveaux';
import {
  CATALOGUE_OUVERTURES,
  modifierOuverture,
  murSousLePoint,
  pointSurMur,
  poserOuverture,
  supprimerOuverture,
} from './ouvertures';
import { alertesEscaliers } from './validations';

describe('portes et fenêtres (DES-13, DES-14)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);
  const haut = n.murs[0]!; // axe de (150, 150) à (10 450, 150), 10,30 m

  it('trouve le mur sous le point, sauf les séparations', () => {
    expect(murSousLePoint(n.murs, { x: 2000, y: 180 }, 50)).toMatchObject({
      mur: { id: haut.id },
      distanceDepuisA: 1850,
    });
    expect(murSousLePoint(n.murs, { x: 5000, y: 4000 }, 50)).toBeNull();
    const separation = { ...haut, id: 'm_sep01', type: 'separation' as const };
    expect(murSousLePoint([separation], { x: 2000, y: 150 }, 50)).toBeNull();
  });

  it('pose une porte centrée, recalée au bout du mur, sans chevauchement', () => {
    const p = ok(poserOuverture(n, { murId: haut.id, type: 'porte', centre: 2000 }, ctx));
    expect(p.ouvertures[0]).toMatchObject({ position: 2000 - 415, largeur: 830, allege: 0 });
    const auBout = ok(poserOuverture(n, { murId: haut.id, type: 'fenetre', centre: 10_250 }, ctx));
    expect(auBout.ouvertures[0]!.position).toBe(10_300 - 800);
    expect(poserOuverture(p, { murId: haut.id, type: 'fenetre', centre: 2100 }, ctx)).toMatchObject(
      { ok: false, code: 'PRECONDITION' },
    );
    expect(poserOuverture(n, { murId: 'm_absent', type: 'porte', centre: 0 }, ctx)).toMatchObject({
      code: 'INTROUVABLE',
    });
  });

  it('refuse une ouverture plus grande que le mur ou plus haute que lui', () => {
    const court = { ...n, murs: [{ ...haut, b: { x: 650, y: 150 } }] };
    expect(
      poserOuverture(court, { murId: haut.id, type: 'porte_garage', centre: 250 }, ctx),
    ).toMatchObject({ ok: false });
    const bas = { ...n, murs: [{ ...haut, hauteur: 1_000 }] };
    expect(poserOuverture(bas, { murId: haut.id, type: 'porte', centre: 2000 }, ctx)).toMatchObject(
      { ok: false },
    );
  });

  it('modifier, inverser le sens, supprimer ; le mur ne peut plus raccourcir sous la porte', () => {
    const p = ok(poserOuverture(n, { murId: haut.id, type: 'porte', centre: 9_000 }, ctx));
    const id = p.ouvertures[0]!.id;
    const m = ok(modifierOuverture(p, id, { largeur: 930, sens: 'droite', cote: 'exterieur' }));
    expect(m.ouvertures[0]).toMatchObject({ largeur: 930, sens: 'droite', cote: 'exterieur' });
    expect(modifierOuverture(p, id, { position: 9_800 })).toMatchObject({ ok: false });
    expect(modifierOuverture(p, id, { largeur: 50 })).toMatchObject({ code: 'ENTREE_INVALIDE' });
    expect(modifierOuverture(p, 'o_absent', {})).toMatchObject({ code: 'INTROUVABLE' });
    expect(modifierLongueurMur(p, haut.id, 6_000, ctx)).toMatchObject({ ok: false });
    expect(ok(supprimerOuverture(p, id)).ouvertures).toHaveLength(0);
    expect(supprimerOuverture(p, 'o_absent')).toMatchObject({ ok: false });
    const sansMur = { ...p, murs: [] };
    expect(modifierOuverture(sansMur, id, {})).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('point sur le mur et catalogue complet', () => {
    expect(pointSurMur(haut, 1000)).toEqual({ x: 1150, y: 150 });
    expect(Object.values(CATALOGUE_OUVERTURES).every((o) => o.largeur > 0 && o.libelle)).toBe(true);
  });
});

describe('escaliers (DES-15)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);

  it('calcule marches et giron confortables pour 2,70 m', () => {
    const { nbMarches, giron } = calculerMarches(2_700, 'droit');
    expect(nbMarches).toBe(15);
    expect(2 * (2_700 / nbMarches) + giron).toBe(630);
    expect(calculerMarches(2_700, 'meunier')).toEqual({ nbMarches: 13, giron: 150 });
    expect(calculerMarches(100, 'droit').nbMarches).toBe(2);
  });

  it('pose, emprise, rotation, modification, suppression', () => {
    const p = ok(
      poserEscalier(
        n,
        { type: 'droit', position: { x: 1000, y: 1000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    );
    const e = p.escaliers[0]!;
    expect(alertesEscaliers(p)).toEqual([]);
    expect(longueurVolee(e)).toBe(14 * e.giron);
    expect(aire(emprise(e))).toBe(900 * longueurVolee(e));
    const tourne = ok(modifierEscalier(p, e.id, { rotation: 900 })).escaliers[0]!;
    expect(emprise(tourne)[1]).toEqual({ x: 1000, y: 1900 });
    expect(ok(modifierEscalier(p, e.id, { rotation: -900 })).escaliers[0]!.rotation).toBe(2700);
    const quart = ok(modifierEscalier(p, e.id, { type: 'quart_bas' })).escaliers[0]!;
    expect(quart.nbMarches).toBe(15);
    expect(modifierEscalier(p, e.id, { largeur: 100 })).toMatchObject({ code: 'ENTREE_INVALIDE' });
    expect(modifierEscalier(p, 'esc_absent', {})).toMatchObject({ code: 'INTROUVABLE' });
    expect(ok(supprimerEscalier(p, e.id)).escaliers).toHaveLength(0);
    expect(supprimerEscalier(p, 'esc_absent')).toMatchObject({ ok: false });
    expect(
      poserEscalier(n, { type: 'droit', position: { x: 0, y: 0 }, hauteurAMonter: 50 }, ctx),
    ).toMatchObject({ ok: false });
  });

  it('marches d’un escalier droit vues de dessus, tournées avec lui ; autres types : aucune', () => {
    const e = ok(
      poserEscalier(
        n,
        { type: 'droit', position: { x: 1000, y: 1000 }, hauteurAMonter: 2_700 },
        ctx,
      ),
    ).escaliers[0]!;
    const m = marchesDroites(e);
    expect(m).toHaveLength(e.nbMarches - 2);
    expect(m[0]).toEqual([
      { x: 1000, y: 1000 + e.giron },
      { x: 1000 + e.largeur, y: 1000 + e.giron },
    ]);
    const [a] = marchesDroites({ ...e, rotation: 900 })[0]!;
    expect(Math.round(a.x)).toBe(1000 - e.giron);
    expect(marchesDroites({ ...e, type: 'meunier' })).toHaveLength(e.nbMarches - 2);
    expect(marchesDroites({ ...e, type: 'helicoidal' })).toEqual([]);
  });

  it('emprise de chaque type', () => {
    const base = { largeur: 900, nbMarches: 15, giron: 280 };
    const types = Object.keys(LIBELLES_ESCALIER) as TypeEscalier[];
    for (const type of types) expect(aire(empriseLocale({ ...base, type }))).toBeGreaterThan(0);
    expect(empriseLocale({ ...base, type: 'quart_haut' })).toHaveLength(6);
  });
});

describe('niveaux (DES-04, DES-05)', () => {
  const ctx = contexteTest();
  const scene = {
    ...nouvelleScene(ctx.nouvelId),
    niveaux: [{ ...niveauMaquette(ctx), id: 'n_rdc0' }],
  };

  it('ajoute un étage au-dessus avec les murs extérieurs, puis des combles et un sous-sol', () => {
    const r = ok(ajouterNiveau(scene, { type: 'etage', copierMurs: true }, ctx));
    const etage = r.niveaux.find((x) => x.id === r.niveauId)!;
    expect(etage).toMatchObject({ nom: 'Étage 1', altitude: 2_700 });
    expect(etage.murs).toHaveLength(4);
    expect(etage.pieces).toHaveLength(1);
    const combles = ok(ajouterNiveau(r, { type: 'combles', copierMurs: false }, ctx));
    expect(combles.niveaux.find((x) => x.id === combles.niveauId)).toMatchObject({
      nom: 'Combles',
      altitude: 5_400,
      hauteurSousPlafond: 2_200,
    });
    const ss = ok(ajouterNiveau(combles, { type: 'sous_sol', copierMurs: false }, ctx));
    expect(niveauxTries(ss)[0]).toMatchObject({ nom: 'Sous-sol', altitude: -2_700 });
    expect(
      ok(ajouterNiveau(ss, { type: 'sous_sol', copierMurs: false }, ctx)).niveaux.at(-1)!.nom,
    ).toBe('Sous-sol 2');
    expect(niveauInferieur(ss, 'n_rdc0')!.nom).toBe('Sous-sol');
    expect(niveauInferieur(ss, ss.niveauId)).toBeNull();
    expect(niveauSuperieur(ss, ss.niveauId)!.id).toBe('n_rdc0');
    expect(niveauSuperieur(ss, 'n_absent')).toBeNull();
  });

  it('au plus 10 niveaux', () => {
    let s = scene;
    for (let i = 0; i < 9; i++) s = ok(ajouterNiveau(s, { type: 'etage', copierMurs: false }, ctx));
    expect(ajouterNiveau(s, { type: 'etage', copierMurs: false }, ctx)).toMatchObject({
      ok: false,
    });
  });

  it('renommer, supprimer (jamais le dernier)', () => {
    const r = ok(ajouterNiveau(scene, { type: 'etage', copierMurs: false }, ctx));
    expect(ok(renommerNiveau(r, r.niveauId, ' Chambres ')).niveaux.at(-1)!.nom).toBe('Chambres');
    expect(renommerNiveau(r, r.niveauId, '')).toMatchObject({ ok: false });
    expect(renommerNiveau(r, 'n_absent', 'X')).toMatchObject({ code: 'INTROUVABLE' });
    expect(ok(supprimerNiveau(r, r.niveauId)).niveaux).toHaveLength(1);
    expect(supprimerNiveau(scene, 'n_rdc0')).toMatchObject({ code: 'PRECONDITION' });
    expect(supprimerNiveau(scene, 'n_absent')).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('trémie de l’étage = emprise de l’escalier du dessous ; hauteur à monter', () => {
    const avecEscalier = {
      ...scene,
      niveaux: [
        ok(
          poserEscalier(
            scene.niveaux[0]!,
            { type: 'droit', position: { x: 500, y: 500 }, hauteurAMonter: 2_700 },
            ctx,
          ),
        ),
      ],
    };
    const r = ok(ajouterNiveau(avecEscalier, { type: 'etage', copierMurs: false }, ctx));
    expect(tremies(r, r.niveauId)).toHaveLength(1);
    expect(tremies(r, 'n_rdc0')).toEqual([]);
    expect(tremies(r, 'n_absent')).toEqual([]);
    expect(hauteurVersLeHaut(r, 'n_rdc0')).toBe(2_700);
    expect(hauteurVersLeHaut(r, 'n_absent')).toBe(2_700);
  });
});

describe('plan importé (D91)', () => {
  const ctx = contexteTest();
  const scene = nouvelleScene(ctx.nouvelId);
  const avec = poserFond(scene, {
    storagePath: 'dessin/particulier/u1/p1/fond.jpg',
    niveauId: scene.niveaux[0]!.id,
  });

  it('pose, taille, mise à l’échelle par deux points', () => {
    expect(avec.fondImage).toMatchObject({ mmPour1000Px: ECHELLE_DEFAUT, opacite: 50 });
    expect(tailleFond(avec.fondImage!, 1000, 800)).toEqual({ l: 10_000, h: 8_000 });
    // Deux points à 5 m sur l'image actuelle, qui mesurent 4 m en vrai.
    const r = ok(mettreFondAEchelle(avec, { x: 0, y: 0 }, { x: 5_000, y: 0 }, 4_000));
    expect(r.fondImage!.mmPour1000Px).toBe(8_000);
    expect(mettreFondAEchelle(avec, { x: 0, y: 0 }, { x: 1, y: 0 }, 4_000)).toMatchObject({
      ok: false,
    });
    expect(mettreFondAEchelle(avec, { x: 0, y: 0 }, { x: 5_000, y: 0 }, 0)).toMatchObject({
      ok: false,
    });
    expect(mettreFondAEchelle(avec, { x: 0, y: 0 }, { x: 5_000, y: 0 }, 999_999_999)).toMatchObject(
      { ok: false },
    );
    expect(mettreFondAEchelle(scene, { x: 0, y: 0 }, { x: 5_000, y: 0 }, 4_000)).toMatchObject({
      code: 'INTROUVABLE',
    });
  });

  it('opacité bornée, position, retrait', () => {
    expect(reglerFond(avec, { opacite: 140 }).fondImage!.opacite).toBe(100);
    expect(reglerFond(avec, { position: { x: 100, y: 200 } }).fondImage).toMatchObject({
      position: { x: 100, y: 200 },
      opacite: 50,
    });
    expect(reglerFond(scene, { opacite: 10 })).toBe(scene);
    expect(retirerFond(avec).fondImage).toBeNull();
  });
});
