import { describe, expect, it } from 'vitest';
import { etatInitial, niveauDe, reduire, sceneDe, type Action } from './etat';
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
const jouer = (actions: Action[]) => actions.reduce(reduire, etatInitial(maison()));

describe('portes et fenêtres dans l’éditeur', () => {
  it('cliquer sur un mur pose l’ouverture et la sélectionne ; hors mur : message', () => {
    const e = jouer([
      { type: 'outil', outil: 'ouverture', typeOuverture: 'porte_entree' },
      { type: 'poserPoint', point: { x: 3000, y: 100 } },
    ]);
    const o = niveauDe(e).ouvertures[0]!;
    expect(o).toMatchObject({ type: 'porte_entree', largeur: 900 });
    expect(e.selection).toEqual({ genre: 'ouverture', id: o.id });
    expect(reduire(e, { type: 'poserPoint', point: { x: 5000, y: 4000 } }).erreur).toMatch(/mur/);
  });

  it('modifier puis supprimer l’ouverture sélectionnée', () => {
    let e = jouer([
      { type: 'outil', outil: 'ouverture', typeOuverture: 'fenetre' },
      { type: 'poserPoint', point: { x: 3000, y: 100 } },
    ]);
    const id = niveauDe(e).ouvertures[0]!.id;
    e = reduire(e, { type: 'modifierOuverture', id, modif: { largeur: 1000 } });
    expect(niveauDe(e).ouvertures[0]!.largeur).toBe(1000);
    e = reduire(e, { type: 'supprimerSelection' });
    expect(niveauDe(e).ouvertures).toHaveLength(0);
  });
});

describe('escaliers dans l’éditeur', () => {
  it('pose un escalier vers le haut, le sélectionne, revient à la sélection', () => {
    let e = jouer([
      { type: 'outil', outil: 'escalier', typeEscalier: 'quart_bas' },
      { type: 'poserPoint', point: { x: 1000, y: 1000 } },
    ]);
    const esc = niveauDe(e).escaliers[0]!;
    expect(esc).toMatchObject({ type: 'quart_bas', hauteurAMonter: 2_700, nbMarches: 15 });
    expect(e).toMatchObject({ outil: 'selection', selection: { genre: 'escalier', id: esc.id } });
    e = reduire(e, { type: 'modifierEscalier', id: esc.id, modif: { rotation: 900 } });
    expect(niveauDe(e).escaliers[0]!.rotation).toBe(900);
    e = reduire(e, { type: 'supprimerSelection' });
    expect(niveauDe(e).escaliers).toHaveLength(0);
  });
});

describe('niveaux dans l’éditeur', () => {
  it('ajouter un étage (murs repris), y aller, renommer, supprimer', () => {
    let e = jouer([{ type: 'ajouterNiveau', niveau: 'etage', copierMurs: true }]);
    expect(sceneDe(e).niveaux).toHaveLength(2);
    expect(niveauDe(e)).toMatchObject({ nom: 'Étage 1' });
    expect(niveauDe(e).murs).toHaveLength(4);
    const etage = e.niveauId;
    e = reduire(e, { type: 'renommerNiveau', niveauId: etage, nom: 'Chambres' });
    expect(niveauDe(e).nom).toBe('Chambres');
    e = reduire(e, { type: 'supprimerNiveau', niveauId: etage });
    expect(sceneDe(e).niveaux).toHaveLength(1);
    expect(e.niveauId).toBe(sceneDe(e).niveaux[0]!.id);
    expect(reduire(e, { type: 'supprimerNiveau', niveauId: e.niveauId }).erreur).toBeTruthy();
    const autre = reduire(e, { type: 'changerNiveau', niveauId: e.niveauId });
    expect(autre.ajustement).toBe(e.ajustement + 1);
    // Annuler l'ajout revient au plan d'avant.
    const ajout = reduire(e, { type: 'ajouterNiveau', niveau: 'sous_sol', copierMurs: false });
    expect(sceneDe(reduire(ajout, { type: 'annuler' })).niveaux).toHaveLength(1);
  });
});

describe('plan importé dans l’éditeur', () => {
  it('poser, régler, mettre à l’échelle par deux points, retirer', () => {
    let e = jouer([{ type: 'poserFond', storagePath: 'dessin/particulier/u/p/fond-1.jpg' }]);
    expect(sceneDe(e).fondImage).toMatchObject({ opacite: 50 });
    e = reduire(e, { type: 'reglerFond', opacite: 30 });
    expect(sceneDe(e).fondImage!.opacite).toBe(30);
    expect(reduire(e, { type: 'mettreAEchelle', distance: 4000 })).toBe(e);
    e = [
      { type: 'outil', outil: 'echelle' },
      { type: 'poserPoint', point: { x: 0, y: 0 } },
      { type: 'poserPoint', point: { x: 5000, y: 0 } },
    ].reduce((x, a) => reduire(x, a as Action), e);
    expect(e.echelle).toEqual({ a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } });
    e = reduire(e, { type: 'mettreAEchelle', distance: 4000 });
    expect(sceneDe(e).fondImage!.mmPour1000Px).toBe(8000);
    expect(e).toMatchObject({ echelle: null, outil: 'selection' });
    e = reduire(e, { type: 'retirerFond' });
    expect(sceneDe(e).fondImage).toBeNull();
  });
});

describe('cotes libres, textes et calques (DES-30, DES-31)', () => {
  it('coter en deux clics, poser un texte, le modifier, le supprimer, masquer un calque', () => {
    let e = jouer([
      { type: 'outil', outil: 'cote' },
      { type: 'poserPoint', point: { x: 0, y: -1000 } },
    ]);
    expect(e.trace).not.toBeNull();
    e = reduire(e, { type: 'poserPoint', point: { x: 10, y: -1000 } });
    expect(e.erreur).toMatch(/courte/);
    e = reduire(e, { type: 'poserPoint', point: { x: 4000, y: -1000 } });
    expect(niveauDe(e).cotes).toHaveLength(1);
    expect(e.trace).toBeNull();
    e = reduire(reduire(e, { type: 'outil', outil: 'texte' }), {
      type: 'poserPoint',
      point: { x: 2000, y: 2000 },
    });
    const t = niveauDe(e).textes[0]!;
    expect(e.selection).toEqual({ genre: 'texte', id: t.id });
    expect(e.outil).toBe('selection');
    e = reduire(e, { type: 'modifierTexte', id: t.id, modif: { contenu: 'Cellier' } });
    expect(niveauDe(e).textes[0]!.contenu).toBe('Cellier');
    e = reduire(e, { type: 'supprimerSelection' });
    expect(niveauDe(e).textes).toHaveLength(0);
    e = reduire(e, {
      type: 'selectionner',
      selection: { genre: 'cote', id: niveauDe(e).cotes[0]!.id },
    });
    e = reduire(e, { type: 'supprimerSelection' });
    expect(niveauDe(e).cotes).toHaveLength(0);
    e = reduire(e, { type: 'calqueScene', cle: 'mobilier' });
    expect(sceneDe(e).calques.mobilier).toBe(false);
  });
});

describe('niveaux dans l’éditeur (DES-04)', () => {
  it('régler la hauteur, monter un niveau, supprimer : les altitudes suivent', () => {
    let e = jouer([
      { type: 'ajouterNiveau', niveau: 'etage', copierMurs: true },
      { type: 'ajouterNiveau', niveau: 'combles', copierMurs: false },
    ]);
    const [rdc, etage, combles] = [...sceneDe(e).niveaux].sort((a, b) => a.altitude - b.altitude);
    e = reduire(e, {
      type: 'reglerNiveau',
      niveauId: rdc!.id,
      reglages: { hauteurSousPlafond: 2_800 },
    });
    const alt = (id: string) => sceneDe(e).niveaux.find((n) => n.id === id)!.altitude;
    expect(alt(etage!.id)).toBe(3_000);
    e = reduire(e, { type: 'deplacerNiveau', niveauId: combles!.id, sens: -1 });
    expect(alt(combles!.id)).toBe(3_000);
    e = reduire(e, { type: 'supprimerNiveau', niveauId: combles!.id });
    expect(alt(etage!.id)).toBe(3_000);
    expect(reduire(e, { type: 'deplacerNiveau', niveauId: etage!.id, sens: 1 }).erreur).toMatch(
      /haut/,
    );
  });
});

describe('pièce libre (DES-12)', () => {
  it('points successifs, fermeture sur le premier point ; Échap ferme aussi ; deux points : abandon', () => {
    const depart = sceneDepuisChoix('vide', {
      largeur: 0,
      profondeur: 0,
      decoupeL: 0,
      decoupeP: 0,
    });
    if (!depart.ok) throw new Error(depart.message);
    const vide = etatInitial(depart.scene);
    const points = [
      { x: 0, y: 0 },
      { x: 6_000, y: 0 },
      { x: 6_000, y: 3_000 },
      { x: 3_000, y: 5_000 },
      { x: 0, y: 5_000 },
    ];
    const poser = (e: typeof vide, pts: typeof points) =>
      pts.reduce(
        (x, point) => reduire(x, { type: 'poserPoint', point }),
        reduire(e, { type: 'outil', outil: 'pieceLibre' }),
      );
    let e = poser(vide, points);
    expect(e.polygone).toHaveLength(5);
    e = reduire(e, { type: 'poserPoint', point: { x: 20, y: 10 } });
    expect([niveauDe(e).murs.length, niveauDe(e).pieces.length, e.polygone.length]).toEqual([
      5, 1, 0,
    ]);
    const echap = reduire(poser(vide, points.slice(0, 3)), { type: 'terminerTrace' });
    expect(niveauDe(echap).pieces).toHaveLength(1);
    const abandon = reduire(poser(vide, points.slice(0, 2)), { type: 'terminerTrace' });
    expect([niveauDe(abandon).murs.length, abandon.polygone.length]).toEqual([0, 0]);
  });
});
