import { mursDepuisForme, nouvelleScene, type Scene } from '@ph/core/dessin';
import { describe, expect, it } from 'vitest';
import { etatInitial, niveauDe, reduire, sceneDe, ZOOM_MAX, type Action } from './etat';

const vide = () => nouvelleScene((p) => `${p}_t${Math.random().toString(36).slice(2, 10)}`);
const jouer = (scene: Scene, actions: Action[]) => actions.reduce(reduire, etatInitial(scene));

describe('éditeur Dessin : désélection', () => {
  const avecPiece = () =>
    jouer(vide(), [
      { type: 'outil', outil: 'piece' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 5000, y: 4000 } },
      { type: 'outil', outil: 'selection' },
    ]);
  const choisi = () => {
    const e = avecPiece();
    return reduire(e, {
      type: 'selectionner',
      selection: { genre: 'mur', id: niveauDe(e).murs[0]!.id },
    });
  };

  it('Échap désélectionne quand rien n’est en cours de tracé', () => {
    const e = choisi();
    expect(e.selection).not.toBeNull();
    const apres = reduire(e, { type: 'echap' });
    expect(apres.selection).toBeNull();
    expect(apres.multi).toEqual([]);
  });

  it('Échap pendant un tracé arrête le tracé, sans rien perdre d’autre', () => {
    const e = jouer(vide(), [
      { type: 'outil', outil: 'mur' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
    ]);
    const apres = reduire(e, { type: 'echap' });
    expect(apres.trace).toBeNull();
    // …et revient au curseur normal.
    expect(apres.outil).toBe('selection');
  });

  it('Échap avec un outil choisi (rien en cours) : retour au curseur normal', () => {
    const e = jouer(vide(), [{ type: 'outil', outil: 'piece' }]);
    expect(reduire(e, { type: 'echap' }).outil).toBe('selection');
  });

  it('le double-clic qui finit un tracé ne désélectionne pas', () => {
    expect(reduire(choisi(), { type: 'terminerTrace' }).selection).not.toBeNull();
  });

  it('passer en 3D, visite, photo ou façades désélectionne tout', () => {
    for (const vue of ['3d', 'visite', 'photo', 'facades'] as const) {
      const apres = reduire(choisi(), { type: 'vue', vue });
      expect(apres.selection, vue).toBeNull();
    }
    expect(reduire(choisi(), { type: 'vue', vue: 'plan' }).selection).not.toBeNull();
  });
});

describe('éditeur Dessin : extrémité de mur aimantée', () => {
  const piece = () =>
    jouer(vide(), [
      { type: 'outil', outil: 'piece' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 5000, y: 4000 } },
      { type: 'outil', outil: 'selection' },
    ]);
  const coin = (e: ReturnType<typeof piece>) => {
    const m = niveauDe(e).murs.find((x) => x.a.x === 5000 && x.a.y === 4000)!;
    return { m, bout: 'a' as const };
  };

  it('tirée presque à angle droit, elle s’y accroche', () => {
    const e = piece();
    const { m } = coin(e);
    const apres = reduire(e, {
      type: 'deplacerExtremite',
      murId: m.id,
      extremite: 'a',
      vers: { x: 5180, y: 4013 },
    });
    const suite = niveauDe(apres).murs.find((x) => x.id === m.id)!;
    // L'autre bout du mur est sur la même verticale ou horizontale : angle droit retrouvé.
    expect(suite.a.x === suite.b.x || suite.a.y === suite.b.y).toBe(true);
    expect(suite.a.x % 50).toBe(0);
  });

  it('avec Alt, elle reste où on la lâche', () => {
    const e = piece();
    const { m } = coin(e);
    const apres = reduire(e, {
      type: 'deplacerExtremite',
      murId: m.id,
      extremite: 'a',
      vers: { x: 5180, y: 4013 },
      libre: true,
    });
    expect(niveauDe(apres).murs.find((x) => x.id === m.id)!.a).toEqual({ x: 5180, y: 4013 });
  });
});

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
    // Mur porteur (murs extérieurs) : pas supprimé d'un geste, l'avertissement s'affiche.
    e = jouer(s, [
      { type: 'selectionner', selection: { genre: 'mur', id: murId } },
      { type: 'supprimerSelection' },
    ]);
    expect(niveauDe(e).murs).toHaveLength(4);
    expect(e.erreur).toMatch(/Mur porteur/);
    expect(e.proprietes).toBe(true);
    // Confirmé dans ses propriétés : supprimé.
    e = reduire(e, { type: 'supprimerSelection', confirme: true });
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
  it('menus repliables et propriétés', () => {
    let e = etatInitial(vide());
    expect(e.menu).toBe('structure');
    e = reduire(e, { type: 'menu', menu: 'structure' });
    expect(e.menu).toBeNull();
    e = reduire(e, { type: 'menu', menu: 'chiffrer' });
    expect(e).toMatchObject({ menu: 'chiffrer', metreVu: true });
    e = reduire(e, { type: 'proprietes' });
    expect(e.proprietes).toBe(false);
    e = reduire(e, { type: 'selectionner', selection: { genre: 'piece', id: 'p_x' } });
    expect(e.proprietes).toBe(true);
    expect(reduire(e, { type: 'proprietes', ouvert: false }).proprietes).toBe(false);
  });

  it('zoom borné, aimant, calques, menu, nouvelle scène', () => {
    let e = jouer(vide(), [
      { type: 'zoom', zoom: 9999 },
      { type: 'aimant' },
      { type: 'calque', cle: 'cotes' },
      { type: 'menu', menu: 'chiffrer' },
      { type: 'ajuster' },
    ]);
    expect(e.ajustement).toBe(2);
    expect(e).toMatchObject({ zoom: ZOOM_MAX, aimant: false, menu: 'chiffrer' });
    expect(e.calques.cotes).toBe(false);
    const autre = vide();
    e = reduire(e, { type: 'remplacerScene', scene: autre });
    expect(sceneDe(e)).toBe(autre);
    expect(e.historique.passe).toHaveLength(0);
    expect(e.menu).toBe('chiffrer');
  });
});

describe('éditeur Dessin : façades et coupe (DES-36)', () => {
  it('coupe : deux clics, puis la vue façades s’ouvre sur la coupe ; trop courte, refusée', () => {
    const e = jouer(vide(), [
      { type: 'facade', facade: 'coupe' }, // pas encore de coupe : on la trace sur le plan
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 100, y: 0 } },
    ]);
    expect(e.outil).toBe('coupe');
    expect(e.erreur).toBeTruthy();
    const f = [{ type: 'poserPoint', point: { x: 6_000, y: 0 } } as const].reduce(reduire, e);
    expect(f).toMatchObject({ vue: 'facades', facade: 'coupe', outil: 'selection', erreur: null });
    expect(f.coupe).toEqual({ a: { x: 0, y: 0 }, b: { x: 6_000, y: 0 } });
    expect(reduire(f, { type: 'facade', facade: 'est' }).facade).toBe('est');
  });
});
