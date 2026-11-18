import { describe, expect, it } from 'vitest';
import { etatInitial, niveauDe, reduire, type Action } from './etat';
import { ciblesDe } from './cibleFinition';
import { sceneDepuisChoix } from './scenesDepart';

const maison = () => {
  const r = sceneDepuisChoix('rectangle', {
    largeur: 10_600,
    profondeur: 8_600,
    decoupeL: 0,
    decoupeP: 0,
  });
  if (!r.ok) throw new Error(r.message);
  return r.scene;
};
const jouer = (actions: Action[], depart = etatInitial(maison())) =>
  actions.reduce(reduire, depart);
// Murs de 20 cm sur des axes à 100 mm : intérieur de 200 à 10 400 (x), de 200 à 8 400 (y).

describe('objets dans l’éditeur (DES-22)', () => {
  it('poser un objet le sélectionne ; glisser, tourner, modifier, dupliquer, supprimer', () => {
    let e = jouer([
      { type: 'outil', outil: 'objet', catalogueId: 'table-6' },
      { type: 'poserPoint', point: { x: 5000, y: 4000 } },
    ]);
    const id = niveauDe(e).objets[0]!.id;
    expect(e).toMatchObject({ outil: 'selection', selection: { genre: 'objet', id } });
    for (let i = 0; i < 3; i++)
      e = reduire(e, { type: 'deplacerObjetDe', id, delta: { x: 100, y: 0 }, geste: 'g' });
    e = reduire(e, { type: 'finGeste' });
    expect(niveauDe(e).objets[0]!.position.x).toBe(5300);
    expect(e.historique.passe).toHaveLength(2);
    e = reduire(e, { type: 'tournerObjet', id, angle: 900 });
    e = reduire(e, {
      type: 'modifierObjet',
      id,
      modif: { dimensions: { l: 2000, p: 900, h: 750 } },
    });
    expect(niveauDe(e).objets[0]).toMatchObject({ rotation: 900, dimensions: { l: 2000 } });
    e = reduire(e, { type: 'dupliquerObjet', id });
    expect(niveauDe(e).objets).toHaveLength(2);
    expect(e.selection?.id).not.toBe(id);
    e = reduire(e, { type: 'supprimerSelection' });
    expect(niveauDe(e).objets).toHaveLength(1);
    expect(reduire(e, { type: 'deplacerObjetDe', id: 'obj_absent', delta: { x: 1, y: 0 } })).toBe(
      e,
    );
    expect(reduire(e, { type: 'dupliquerObjet', id: 'obj_absent' }).erreur).toBeTruthy();
  });
});

describe('décoration dans l’éditeur (DES-25 à DES-28)', () => {
  it('murs de la pièce, copier-coller un style, zone au sol', () => {
    let e = etatInitial(maison());
    const pieceId = niveauDe(e).pieces[0]!.id;
    const murId = niveauDe(e).murs[0]!.id;
    e = reduire(e, {
      type: 'revetirMurs',
      pieceId,
      revetement: { famille: 'peinture', couleur: '#b7c4b1' },
    });
    expect(
      niveauDe(e).murs.some((m) => m.faceA.couleur === '#b7c4b1' || m.faceB.couleur === '#b7c4b1'),
    ).toBe(true);

    const parquet = { famille: 'parquet' as const, couleur: '#d9b98c' };
    e = reduire(e, { type: 'collerStyle' });
    e = reduire(e, { type: 'copierStyle', revetement: parquet });
    expect(reduire(e, { type: 'collerStyle' })).toBe(e);
    e = reduire(e, { type: 'selectionner', selection: { genre: 'piece', id: pieceId } });
    e = reduire(e, { type: 'collerStyle' });
    expect(niveauDe(e).pieces[0]!.sol).toEqual(parquet);
    e = reduire(e, { type: 'selectionner', selection: { genre: 'mur', id: murId } });
    e = reduire(e, { type: 'collerStyle' });
    expect(niveauDe(e).murs[0]).toMatchObject({ faceA: parquet, faceB: parquet });
    e = reduire(e, { type: 'selectionner', selection: { genre: 'objet', id: 'obj_x' } });
    expect(reduire(e, { type: 'collerStyle' }).historique.present).toEqual(e.historique.present);

    // Zone : deux coins dans la pièce, revêtement copié ; hors pièce : message.
    e = jouer(
      [
        { type: 'outil', outil: 'zone' },
        { type: 'poserPoint', point: { x: 1000, y: 1000 } },
        { type: 'poserPoint', point: { x: 3000, y: 2000 } },
      ],
      e,
    );
    const zone = niveauDe(e).zonesDeco[0]!;
    expect(zone.revetement).toEqual(parquet);
    expect(e.selection).toEqual({ genre: 'zone', id: zone.id });
    e = reduire(e, { type: 'revetirZone', id: zone.id, revetement: { famille: 'carrelage' } });
    expect(niveauDe(e).zonesDeco[0]!.revetement.famille).toBe('carrelage');
    e = reduire(e, { type: 'supprimerSelection' });
    expect(niveauDe(e).zonesDeco).toHaveLength(0);
    const hors = jouer([
      { type: 'outil', outil: 'zone' },
      { type: 'poserPoint', point: { x: -5000, y: -5000 } },
      { type: 'poserPoint', point: { x: 3000, y: 2000 } },
    ]);
    expect(hors.erreur).toMatch(/intérieur/);
    const debordante = jouer([
      { type: 'outil', outil: 'zone' },
      { type: 'poserPoint', point: { x: 1000, y: 1000 } },
      { type: 'poserPoint', point: { x: 30_000, y: 2000 } },
    ]);
    expect(debordante.erreur).toMatch(/rester dans la pièce/);
    expect(debordante.trace).toBeNull();
  });
});

describe('clavier et cibles des finitions', () => {
  it('R tourne l’objet choisi, les flèches le déplacent', () => {
    let e = jouer([
      { type: 'outil', outil: 'objet', catalogueId: 'table-6' },
      { type: 'poserPoint', point: { x: 5000, y: 4000 } },
      { type: 'tournerSelection' },
      { type: 'deplacerClavier', delta: { x: 0, y: 100 } },
      { type: 'finGeste' },
    ]);
    expect(niveauDe(e).objets[0]).toMatchObject({ rotation: 900, position: { y: 4100 } });
    e = reduire(e, { type: 'selectionner', selection: null });
    expect(reduire(e, { type: 'tournerSelection' })).toBe(e);
  });

  it('pièce : sol, murs, plafond ; mur : un ou deux côtés ; rien : aucune', () => {
    let e = etatInitial(maison());
    expect(ciblesDe(e)).toEqual([]);
    const n = niveauDe(e);
    e = reduire(e, { type: 'selectionner', selection: { genre: 'piece', id: n.pieces[0]!.id } });
    expect(ciblesDe(e).map((c) => c.cle)).toEqual(['sol', 'murs', 'plafond']);
    const parquet = { famille: 'parquet' as const, couleur: '#d9b98c' };
    e = ciblesDe(e)[0]!.appliquer(parquet).reduce(reduire, e);
    expect(niveauDe(e).pieces[0]!.sol).toEqual(parquet);
    e = reduire(e, { type: 'selectionner', selection: { genre: 'mur', id: n.murs[0]!.id } });
    const deux = ciblesDe(e).find((c) => c.cle === 'ab')!;
    e = deux.appliquer({ famille: 'peinture', couleur: '#b7c4b1' }).reduce(reduire, e);
    expect(niveauDe(e).murs[0]).toMatchObject({
      faceA: { couleur: '#b7c4b1' },
      faceB: { couleur: '#b7c4b1' },
    });
  });
});
