import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import {
  CATALOGUE_OBJETS,
  CATEGORIES_OBJETS,
  chercherObjets,
  LIBELLES_CATEGORIE,
  objetDuCatalogue,
  plagesDe,
} from './catalogue';
import { planDeTravail, triangleActivite } from './cuisine';
import { aire } from './geometrie';
import { LIBELLES_EQUIPEMENT, metreNiveau } from './metre';
import {
  chevauchent,
  collisions,
  contourObjet,
  deplacerObjet,
  dupliquerObjet,
  modifierObjet,
  objetAPoser,
  poserObjet,
  supprimerObjet,
  tournerObjet,
} from './objets';
import {
  ajouterZoneSol,
  facesDeLaPiece,
  FAMILLES_MUR,
  FAMILLES_SOL,
  revetementDe,
  revetirMursDeLaPiece,
  revetirZone,
  supprimerZone,
} from './revetements';
// Pièce de la maquette : axes à 150 mm, intérieur de 300 à 10 300 (x) et de 300 à 8 300 (y).

describe('catalogue (DES-21)', () => {
  it('chaque catégorie a des objets, identifiants uniques, prestations existantes', () => {
    expect(
      CATEGORIES_OBJETS.every((c) =>
        CATALOGUE_OBJETS.some((o) => o.categorie === c && LIBELLES_CATEGORIE[c]),
      ),
    ).toBe(true);
    expect(new Set(CATALOGUE_OBJETS.map((o) => o.id)).size).toBe(CATALOGUE_OBJETS.length);
    const json = JSON.parse(
      readFileSync(
        new URL('../../../../docs/data/prestations-catalogue.json', import.meta.url),
        'utf8',
      ),
    ) as { prestations: { id: string }[] };
    const ids = new Set(json.prestations.map((p) => p.id));
    for (const o of CATALOGUE_OBJETS)
      if (o.prestationId) expect(ids.has(o.prestationId), o.id).toBe(true);
    expect(ids.has('cuisine-plan')).toBe(true);
    expect(Object.keys(LIBELLES_EQUIPEMENT).every((id) => ids.has(id))).toBe(true);
  });

  it('recherche sans accents, plages', () => {
    expect(chercherObjets('refrigerateur').map((o) => o.id)).toEqual(['refrigerateur']);
    expect(chercherObjets('lit chambre').length).toBeGreaterThan(2);
    expect(chercherObjets('  ')).toEqual([]);
    expect(plagesDe(objetDuCatalogue('meuble-bas-60')!).l).toEqual([150, 1200]);
    expect(plagesDe(objetDuCatalogue('chaise')!).l).toEqual([225, 675]);
    expect(objetDuCatalogue('inconnu')).toBeUndefined();
  });
});

describe('objets (DES-22)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);

  it('un objet libre se pose au point ; un objet contre mur se colle au mur, dos au mur', () => {
    const table = ok(poserObjet(n, { catalogueId: 'table-6', position: { x: 5000, y: 4000 } }, ctx))
      .objets[0]!;
    expect(table).toMatchObject({ position: { x: 5000, y: 4000 }, rotation: 0 });
    // Buffet posé près du mur du haut (face intérieure à y = 300) : collé, centre à 300 + 450 / 2.
    const buffet = ok(poserObjet(n, { catalogueId: 'buffet', position: { x: 3000, y: 700 } }, ctx))
      .objets[0]!;
    expect(buffet.position).toEqual({ x: 3000, y: 525 });
    expect(Math.min(...contourObjet(buffet).map((p) => p.y))).toBeCloseTo(300, 0);
    expect(buffet.accrocheMurId).toBe(n.murs[0]!.id);
    // Contre le mur de droite (face intérieure à x = 10 300) : tourné d'un quart de tour.
    const lit = ok(poserObjet(n, { catalogueId: 'lit-140', position: { x: 9800, y: 4000 } }, ctx))
      .objets[0]!;
    expect(Math.round(Math.max(...contourObjet(lit).map((p) => p.x)))).toBe(10_300);
    expect([900, 2700]).toContain(lit.rotation);
    // Trop loin de tout mur : posé tel quel.
    const loin = ok(poserObjet(n, { catalogueId: 'buffet', position: { x: 5000, y: 4000 } }, ctx))
      .objets[0]!;
    expect(loin.accrocheMurId).toBeUndefined();
    expect(poserObjet(n, { catalogueId: 'inconnu', position: { x: 0, y: 0 } }, ctx)).toMatchObject({
      code: 'INTROUVABLE',
    });
  });

  it('aperçu sous le pointeur : même placement que la pose, guides compris', () => {
    const apercu = objetAPoser(n, 'buffet', { x: 3000, y: 700 })!;
    expect(apercu.objet).toMatchObject({ id: 'obj_apercu', position: { x: 3000, y: 525 } });
    expect(apercu.guides.length).toBeGreaterThan(0);
    expect(
      objetAPoser(n, 'buffet', { x: 3000, y: 700 }, { aimant: false })!.objet.position,
    ).toEqual({ x: 3000, y: 700 });
    expect(objetAPoser(n, 'inconnu', { x: 0, y: 0 })).toBeNull();
  });

  it('déplacer (recollé au mur), tourner, redimensionner dans les plages, dupliquer, supprimer', () => {
    let m = ok(poserObjet(n, { catalogueId: 'meuble-bas-60', position: { x: 2000, y: 600 } }, ctx));
    const id = m.objets[0]!.id;
    m = ok(deplacerObjet(m, id, { x: 4000, y: 900 }));
    expect(m.objets[0]!.position).toEqual({ x: 4000, y: 600 });
    m = ok(deplacerObjet(m, id, { x: 5000, y: 4000 }));
    expect(m.objets[0]!.accrocheMurId).toBeUndefined();
    expect(ok(tournerObjet(m, id, -900)).objets[0]!.rotation).toBe(2700);
    expect(
      ok(modifierObjet(m, id, { dimensions: { l: 800, p: 600, h: 870 } })).objets[0]!.dimensions.l,
    ).toBe(800);
    expect(modifierObjet(m, id, { dimensions: { l: 2000, p: 600, h: 870 } })).toMatchObject({
      code: 'ENTREE_INVALIDE',
    });
    expect(
      ok(modifierObjet(m, id, { materiaux: { facade: '#c8775a' } })).objets[0]!.materiaux.facade,
    ).toBe('#c8775a');
    expect(modifierObjet(m, id, { altitude: -5 })).toMatchObject({ code: 'ENTREE_INVALIDE' });
    const d = ok(dupliquerObjet(m, id, ctx));
    expect(d.objets).toHaveLength(2);
    expect(d.objets[1]!.position).toEqual({ x: 5600, y: 4000 });
    expect(ok(supprimerObjet(d, d.copieId)).objets).toHaveLength(1);
    for (const r of [
      deplacerObjet(m, 'obj_x', { x: 0, y: 0 }),
      tournerObjet(m, 'obj_x', 1),
      modifierObjet(m, 'obj_x', {}),
      dupliquerObjet(m, 'obj_x', ctx),
      supprimerObjet(m, 'obj_x'),
    ])
      expect(r).toMatchObject({ code: 'INTROUVABLE' });
  });

  it('collisions : objets au sol qui se chevauchent, objet dans un mur ; tapis et objets en hauteur ignorés', () => {
    let m = ok(poserObjet(n, { catalogueId: 'table-6', position: { x: 5000, y: 4000 } }, ctx));
    m = ok(poserObjet(m, { catalogueId: 'table-basse', position: { x: 5500, y: 4200 } }, ctx));
    m = ok(poserObjet(m, { catalogueId: 'tapis', position: { x: 5000, y: 4000 } }, ctx));
    m = ok(poserObjet(m, { catalogueId: 'suspension', position: { x: 5000, y: 4000 } }, ctx));
    expect(collisions(m)).toEqual([
      { objetId: m.objets[0]!.id, avec: { genre: 'objet', id: m.objets[1]!.id } },
    ]);
    const dansLeMur = { ...m, objets: [{ ...m.objets[0]!, position: { x: 1000, y: 150 } }] };
    expect(collisions(dansLeMur)[0]!.avec.genre).toBe('mur');
    const carre = (x: number) => [
      { x, y: 0 },
      { x: x + 10, y: 0 },
      { x: x + 10, y: 10 },
      { x, y: 10 },
    ];
    expect(chevauchent(carre(0), carre(10))).toBe(false);
    expect(chevauchent(carre(0), carre(4))).toBe(true);
  });
});

describe('cuisine (DES-23)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);
  it('plan de travail continu sur les meubles bas, triangle d’activité', () => {
    let m = n;
    for (const [catalogueId, x] of [
      ['evier-120', 1000],
      ['meuble-bas-60', 1900],
      ['plaque-60', 2500],
      ['meuble-haut-60', 1900],
    ] as const)
      m = ok(poserObjet(m, { catalogueId, position: { x, y: 600 } }, ctx));
    const plan = planDeTravail(m);
    expect(plan.contours).toHaveLength(3);
    expect(plan.longueur).toBe(2400);
    expect(aire(plan.contours[0]!)).toBe(1200 * 630);
    expect(triangleActivite(m)).toBeNull();
    const avecFrigo = ok(
      poserObjet(m, { catalogueId: 'refrigerateur', position: { x: 3500, y: 600 } }, ctx),
    );
    expect(triangleActivite(avecFrigo)).toMatchObject({ conseil: 'bon' });
    const serre = ok(
      poserObjet(m, { catalogueId: 'refrigerateur', position: { x: 1600, y: 600 } }, ctx),
    );
    expect(triangleActivite(serre)!.conseil).toBe('trop_petit');
    const loin = {
      ...avecFrigo,
      objets: avecFrigo.objets.map((o) =>
        o.catalogueId === 'refrigerateur' ? { ...o, position: { x: 10_000, y: 8_000 } } : o,
      ),
    };
    expect(triangleActivite(loin)!.conseil).toBe('trop_grand');
    const metre = metreNiveau(avecFrigo);
    expect(metre.find((l) => l.poste === 'plan_de_travail')).toMatchObject({
      quantite: 2400,
      prestationId: 'cuisine-plan',
    });
    expect(metre.find((l) => l.poste === 'equipements')).toMatchObject({
      quantite: 4,
      prestationId: 'cuisine-pose',
    });
  });
});

describe('revêtements (DES-25 à DES-28)', () => {
  const ctx = contexteTest();
  const n = niveauMaquette(ctx);
  const piece = n.pieces[0]!;

  it('familles par support ; toute la pièce ; pipette', () => {
    expect(FAMILLES_SOL).toContain('parquet');
    expect(FAMILLES_MUR).toContain('papier_peint');
    expect(facesDeLaPiece(n, piece.id)).toHaveLength(4);
    expect(facesDeLaPiece(n, 'p_absent')).toEqual([]);
    const peint = ok(
      revetirMursDeLaPiece(n, piece.id, { famille: 'peinture', couleur: '#b7c4b1' }),
    );
    const faces = facesDeLaPiece(peint, piece.id);
    expect(
      faces.every(
        (f) =>
          revetementDe(peint, { genre: 'mur', murId: f.murId, face: f.face })?.couleur ===
          '#b7c4b1',
      ),
    ).toBe(true);
    expect(revetirMursDeLaPiece(n, 'p_absent', { famille: 'peinture' })).toMatchObject({
      ok: false,
    });
    expect(revetementDe(n, { genre: 'piece', pieceId: piece.id, surface: 'sol' })).toEqual({
      famille: 'aucun',
    });
    expect(revetementDe(n, { genre: 'mur', murId: 'm_absent', face: 'a' })).toBeNull();
    expect(revetementDe(n, { genre: 'piece', pieceId: 'p_absent', surface: 'sol' })).toBeNull();
  });

  it('zone décorative au sol : dans la pièce seulement ; revêtir, supprimer', () => {
    const contour = [
      { x: 1000, y: 1000 },
      { x: 3000, y: 1000 },
      { x: 3000, y: 2000 },
      { x: 1000, y: 2000 },
    ];
    const carreaux = {
      famille: 'carrelage' as const,
      format: { l: 600, p: 600 },
      pose: 'diagonale' as const,
    };
    const r = ok(ajouterZoneSol(n, { pieceId: piece.id, contour, revetement: carreaux }, ctx));
    expect(r.zonesDeco[0]).toMatchObject({
      support: { genre: 'piece', surface: 'sol' },
      revetement: { pose: 'diagonale' },
    });
    expect(
      ok(revetirZone(r, r.zoneId, { famille: 'parquet' })).zonesDeco[0]!.revetement.famille,
    ).toBe('parquet');
    expect(ok(supprimerZone(r, r.zoneId)).zonesDeco).toHaveLength(0);
    expect(revetirZone(r, 'z_absent', carreaux)).toMatchObject({ ok: false });
    expect(supprimerZone(r, 'z_absent')).toMatchObject({ ok: false });
    expect(
      ajouterZoneSol(
        n,
        {
          pieceId: piece.id,
          contour: contour.map((p) => ({ ...p, x: p.x + 9000 })),
          revetement: carreaux,
        },
        ctx,
      ),
    ).toMatchObject({ code: 'PRECONDITION' });
    expect(
      ajouterZoneSol(n, { pieceId: 'p_absent', contour, revetement: carreaux }, ctx),
    ).toMatchObject({ code: 'INTROUVABLE' });
    expect(
      ajouterZoneSol(
        n,
        { pieceId: piece.id, contour: contour.slice(0, 2), revetement: carreaux },
        ctx,
      ),
    ).toMatchObject({ code: 'ENTREE_INVALIDE' });
  });
});
