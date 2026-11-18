import { mursDepuisForme, nouvelleScene, type Scene } from '@ph/core/dessin';
import { describe, expect, it } from 'vitest';
import { etatInitial, niveauDe, reduire, sceneDe, ZOOM_MAX, type Action } from './etat';

const vide = () => nouvelleScene((p) => `${p}_t${Math.random().toString(36).slice(2, 10)}`);
const jouer = (scene: Scene, actions: Action[]) => actions.reduce(reduire, etatInitial(scene));

describe('éditeur Dessin : tracé', () => {
  it('trace des murs à la suite, puis s’arrête', () => {
    const e = jouer(vide(), [
      { type: 'outil', outil: 'mur' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 4000, y: 0 } },
      { type: 'poserPoint', point: { x: 4000, y: 3000 } },
      { type: 'terminerTrace' },
    ]);
    expect(niveauDe(e).murs).toHaveLength(2);
    expect(niveauDe(e).murs[1]!.a).toEqual({ x: 4000, y: 0 });
    expect(e.trace).toBeNull();
    expect(e.historique.passe).toHaveLength(2);
  });

  it('un segment nul est refusé avec un message, le tracé reste en place', () => {
    const e = jouer(vide(), [
      { type: 'outil', outil: 'mur', typeMur: 'cloison' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
    ]);
    expect(e.erreur).toBeTruthy();
    expect(e.trace).toEqual({ x: 0, y: 0 });
    expect(reduire(e, { type: 'effacerErreur' }).erreur).toBeNull();
  });

  it('une pièce d’un geste : 4 murs et une pièce détectée', () => {
    const e = jouer(vide(), [
      { type: 'outil', outil: 'piece' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 5000, y: 4000 } },
    ]);
    expect(niveauDe(e).murs).toHaveLength(4);
    expect(niveauDe(e).pieces).toHaveLength(1);
    // Une seule étape d'historique pour les 4 murs.
    expect(e.historique.passe).toHaveLength(1);
    const plat = jouer(vide(), [
      { type: 'outil', outil: 'piece' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 5000, y: 0 } },
    ]);
    expect(plat.erreur).toMatch(/rectangle/);
  });

  it('en mode sélection, cliquer ne trace rien', () => {
    const e = jouer(vide(), [{ type: 'poserPoint', point: { x: 1, y: 1 } }]);
    expect(e.trace).toBeNull();
  });
});

describe('éditeur Dessin : modifications', () => {
  const avecRectangle = () => {
    const s = vide();
    const r = mursDepuisForme(
      { forme: 'rectangle', largeur: 10_600, profondeur: 8_600 },
      {
        epaisseur: 300,
        hauteur: 2500,
        nouvelId: (p) => `${p}_r${Math.random().toString(36).slice(2, 9)}`,
      },
    );
    if (!r.ok) throw new Error(r.message);
    return { ...s, niveaux: [{ ...s.niveaux[0]!, murs: r.data }] };
  };

  it('cote modifiée, annuler, rétablir', () => {
    const s = avecRectangle();
    const murId = s.niveaux[0]!.murs[0]!.id;
    let e = jouer(s, [{ type: 'modifierLongueur', murId, longueur: 8_300 }]);
    expect(niveauDe(e).murs[0]!.b.x).toBe(150 + 8_300);
    e = reduire(e, { type: 'annuler' });
    expect(niveauDe(e).murs[0]!.b.x).toBe(10_450);
    e = reduire(e, { type: 'retablir' });
    expect(niveauDe(e).murs[0]!.b.x).toBe(8_450);
  });

  it('un glisser de mur ne fait qu’une étape d’historique', () => {
    const s = avecRectangle();
    const murId = s.niveaux[0]!.murs[1]!.id;
    let e = etatInitial(s);
    for (let i = 0; i < 5; i++)
      e = reduire(e, { type: 'deplacerMur', murId, delta: { x: -100, y: 0 }, geste: 'g1' });
    e = reduire(e, { type: 'finGeste' });
    expect(niveauDe(e).murs[1]!.a.x).toBe(10_450 - 500);
    expect(e.historique.passe).toHaveLength(1);
  });

  it('flèches du clavier : seulement avec un mur sélectionné', () => {
    const s = avecRectangle();
    const murId = s.niveaux[0]!.murs[1]!.id;
    expect(
      jouer(s, [{ type: 'deplacerClavier', delta: { x: 10, y: 0 } }]).historique.passe,
    ).toHaveLength(0);
    const e = jouer(s, [
      { type: 'selectionner', selection: { genre: 'mur', id: murId } },
      { type: 'deplacerClavier', delta: { x: 100, y: 0 } },
    ]);
    expect(niveauDe(e).murs[1]!.a.x).toBe(10_550);
  });

  it('supprimer la sélection, renommer, revêtement', () => {
    const s = avecRectangle();
    const murId = s.niveaux[0]!.murs[0]!.id;
    let e = jouer(s, [{ type: 'supprimerSelection' }]);
    expect(niveauDe(e).murs).toHaveLength(4);
    e = jouer(s, [
      { type: 'selectionner', selection: { genre: 'mur', id: murId } },
      { type: 'supprimerSelection' },
    ]);
    expect(niveauDe(e).murs).toHaveLength(3);
    expect(e.selection).toBeNull();

    e = jouer(s, [{ type: 'modifierLongueur', murId, longueur: 10_300 }]);
    const pieceId = niveauDe(e).pieces[0]!.id;
    e = reduire(e, { type: 'renommerPiece', pieceId, nom: 'Séjour' });
    e = reduire(e, {
      type: 'revetement',
      cible: { genre: 'piece', pieceId, surface: 'sol' },
      revetement: { famille: 'parquet', couleur: '#d9b98c' },
    });
    expect(niveauDe(e).pieces[0]).toMatchObject({ nom: 'Séjour', sol: { famille: 'parquet' } });
  });
});

describe('éditeur Dessin : affichage', () => {
  it('zoom borné, aimant, calques, onglet, nouvelle scène', () => {
    let e = jouer(vide(), [
      { type: 'zoom', zoom: 9999 },
      { type: 'aimant' },
      { type: 'calque', cle: 'cotes' },
      { type: 'onglet', onglet: 'chiffrer' },
      { type: 'ajuster' },
    ]);
    expect(e.ajustement).toBe(2);
    expect(e).toMatchObject({ zoom: ZOOM_MAX, aimant: false, onglet: 'chiffrer' });
    expect(e.calques.cotes).toBe(false);
    const autre = vide();
    e = reduire(e, { type: 'remplacerScene', scene: autre });
    expect(sceneDe(e)).toBe(autre);
    expect(e.historique.passe).toHaveLength(0);
    expect(e.onglet).toBe('chiffrer');
  });
});
