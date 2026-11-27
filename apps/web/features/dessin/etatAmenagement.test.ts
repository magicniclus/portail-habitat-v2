import { describe, expect, it } from 'vitest';
import { etatInitial, niveauDe, reduire, sceneDe, type Action } from './etat';
import { cotesContreLaMaison, marchesTerrasse } from '@ph/core/dessin';
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
    // Le second coin est ramené dans la pièce : la zone s'arrête au mur, sans erreur.
    expect(debordante.erreur).toBeNull();
    expect(debordante.trace).toBeNull();
    const bord = Math.max(...niveauDe(debordante).pieces[0]!.contour.map((p) => p.x));
    const bornee = niveauDe(debordante).zonesDeco.at(-1)!;
    expect(Math.max(...bornee.contour.map((p) => p.x))).toBeLessThan(bord);
  });
});

describe('placement automatique et rotation libre', () => {
  it('glisser près d’un mur : collé, guides affichés puis effacés ; Alt ou aimant coupé : libre', () => {
    let e = jouer([
      { type: 'outil', outil: 'objet', catalogueId: 'buffet' },
      { type: 'poserPoint', point: { x: 5000, y: 4000 } },
    ]);
    const id = niveauDe(e).objets[0]!.id;
    // Intérieur du mur du haut à y = 200 : buffet de 45 cm, centre à 425.
    e = reduire(e, { type: 'deplacerObjetVers', id, vers: { x: 3000, y: 600 }, geste: 'g' });
    expect(niveauDe(e).objets[0]!.position).toEqual({ x: 3000, y: 425 });
    expect(e.guides.length).toBeGreaterThan(0);
    const libre = reduire(e, {
      type: 'deplacerObjetVers',
      id,
      vers: { x: 3000, y: 600 },
      libre: true,
    });
    expect(niveauDe(libre).objets[0]!.position).toEqual({ x: 3000, y: 600 });
    e = reduire(e, { type: 'finGeste' });
    expect(e.guides).toEqual([]);
    e = reduire(e, { type: 'aimant' });
    e = reduire(e, { type: 'deplacerObjetVers', id, vers: { x: 3000, y: 650 } });
    expect(niveauDe(e).objets[0]!.position).toEqual({ x: 3000, y: 650 });
    expect(reduire(e, { type: 'deplacerObjetVers', id: 'obj_x', vers: { x: 0, y: 0 } })).toBe(e);
  });

  it('curseur de rotation : un seul pas d’historique par geste', () => {
    let e = jouer([
      { type: 'outil', outil: 'objet', catalogueId: 'table-6' },
      { type: 'poserPoint', point: { x: 5000, y: 4000 } },
    ]);
    const id = niveauDe(e).objets[0]!.id;
    const avant = e.historique.passe.length;
    for (const x of [100, 200, 300])
      e = reduire(e, { type: 'orienterObjet', id, angles: { x }, geste: 'o' });
    e = reduire(e, { type: 'finGeste' });
    expect(niveauDe(e).objets[0]!.inclinaison).toEqual({ x: 300, y: 0 });
    expect(e.historique.passe).toHaveLength(avant + 1);
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

  it('pièce : sol, murs, plafond ; mur : un ou deux côtés ; rien : les façades', () => {
    let e = etatInitial(maison());
    expect(ciblesDe(e).map((c) => c.cle)).toEqual(['exterieurs']);
    const n = niveauDe(e);
    e = reduire(e, { type: 'selectionner', selection: { genre: 'piece', id: n.pieces[0]!.id } });
    expect(ciblesDe(e).map((c) => c.cle)).toEqual(['sol', 'murs', 'plafond', 'exterieurs']);
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
    // Côtés nommés par ce qu'ils regardent ; toutes les façades d'un coup, puis une seule.
    expect(ciblesDe(e).map((c) => c.libelle)).toEqual(
      expect.arrayContaining(['Côté extérieur', 'Tous les murs extérieurs']),
    );
    const enduit = { famille: 'enduit' as const, couleur: '#d8d2c4' };
    e = ciblesDe(e)
      .find((c) => c.cle === 'exterieurs')!
      .appliquer(enduit)
      .reduce(reduire, e);
    const dehors = niveauDe(e).murs.filter(
      (m) => m.faceA.couleur === '#d8d2c4' || m.faceB.couleur === '#d8d2c4',
    );
    expect(dehors.length).toBe(niveauDe(e).murs.filter((m) => m.type !== 'separation').length);
  });
});

describe('extérieur dans l’éditeur (DES-18 à DES-20)', () => {
  it('terrasse et piscine en deux coins, clôture point par point, suppression', () => {
    let e = jouer([
      { type: 'outil', outil: 'exterieur', elementExterieur: 'terrasse' },
      { type: 'poserPoint', point: { x: 1_000, y: 9_200 } },
      { type: 'poserPoint', point: { x: 6_000, y: 11_200 } },
    ]);
    expect(niveauDe(e).exterieur.terrasses).toHaveLength(1);
    // À 60 cm de la façade sud (y = 8 600) : la terrasse s'y colle.
    expect(niveauDe(e).exterieur.terrasses[0]!.contour[0]).toEqual({ x: 1_000, y: 8_600 });
    expect(e.selection?.genre).toBe('terrasse');
    e = jouer(
      [
        { type: 'outil', outil: 'exterieur', elementExterieur: 'piscine', formePiscine: 'ovale' },
        { type: 'poserPoint', point: { x: 6_000, y: 11_800 } },
        { type: 'poserPoint', point: { x: 12_000, y: 14_800 } },
      ],
      e,
    );
    expect(niveauDe(e).exterieur.piscines[0]).toMatchObject({
      forme: 'ovale',
      longueur: 6_000,
      largeur: 3_000,
    });
    // Un coin tiré : la piscine s'étire comme un sol.
    e = reduire(e, {
      type: 'poigneeExterieur',
      poignee: 'coinPiscine',
      id: niveauDe(e).exterieur.piscines[0]!.id,
      i: 2,
      vers: { x: 13_000, y: 15_800 },
    });
    expect(niveauDe(e).exterieur.piscines[0]).toMatchObject({ longueur: 7_000, largeur: 4_000 });
    e = jouer(
      [
        { type: 'outil', outil: 'exterieur', elementExterieur: 'cloture', typeCloture: 'grillage' },
        { type: 'poserPoint', point: { x: -2_500, y: 17_000 } },
        { type: 'poserPoint', point: { x: 12_500, y: 17_000 } },
        { type: 'poserPoint', point: { x: 12_500, y: 22_000 } },
        { type: 'terminerTrace' },
      ],
      e,
    );
    expect(niveauDe(e).exterieur.clotures).toHaveLength(1);
    // Une clôture qui traverserait la terrasse est refusée, avec un message.
    const refus = jouer(
      [
        { type: 'outil', outil: 'exterieur', elementExterieur: 'cloture' },
        { type: 'poserPoint', point: { x: -2_500, y: 9_500 } },
        { type: 'poserPoint', point: { x: 12_500, y: 9_500 } },
      ],
      e,
    );
    expect(refus.erreur).toBe('La clôture traverserait la terrasse.');
    expect(niveauDe(e).exterieur.clotures[0]!.points).toHaveLength(3);
    expect(e.clotureEnCours).toBeNull();
    e = jouer(
      [
        { type: 'parcelleAutour' },
        {
          type: 'selectionner',
          selection: { genre: 'piscine', id: niveauDe(e).exterieur.piscines[0]!.id },
        },
        { type: 'supprimerSelection' },
      ],
      e,
    );
    expect(niveauDe(e).exterieur.piscines).toHaveLength(0);
    expect(sceneDe(e).terrain?.parcelle).toHaveLength(4);
  });
});

describe('terrasse à l’ouest de la maison', () => {
  it('collée à la façade ouest : ce côté n’a pas de garde-corps, les marches partent à l’ouest', () => {
    const e = jouer([
      { type: 'outil', outil: 'exterieur', elementExterieur: 'terrasse' },
      { type: 'poserPoint', point: { x: -2_500, y: 1_000 } },
      { type: 'poserPoint', point: { x: -400, y: 4_000 } },
    ]);
    const t = niveauDe(e).exterieur.terrasses[0]!;
    expect(t.contour[1]!.x).toBe(0);
    expect(cotesContreLaMaison(niveauDe(e), t.contour)).toEqual([false, true, false, false]);
    const m = marchesTerrasse({ ...t, hauteur: 600 }, { x: 5_300, y: 4_300 })!;
    expect(m.cote).toBe(3);
  });
});
