import { describe, expect, it } from 'vitest';
import { etatInitial, niveauDe, reduire, sceneDe, type Action } from './etat';
import { raccourci } from './raccourcis';
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
const jouer = (actions: Action[], e = etatInitial(maison())) => actions.reduce(reduire, e);
const meubles: Action[] = [2_000, 5_000, 8_000].flatMap((x): Action[] => [
  { type: 'outil', outil: 'objet', catalogueId: 'canape-3' },
  { type: 'poserPoint', point: { x, y: 4_000 + x / 10 } },
]);

describe('sélection multiple dans l’éditeur (DES-29)', () => {
  it('Maj + clic ajoute puis retire ; un clic simple revient à un seul élément', () => {
    const e = jouer([...meubles, { type: 'outil', outil: 'selection' }]);
    const [a, b] = niveauDe(e).objets;
    let s = reduire(e, { type: 'selectionner', selection: { genre: 'objet', id: a!.id } });
    s = reduire(s, {
      type: 'selectionner',
      selection: { genre: 'objet', id: b!.id },
      ajouter: true,
    });
    expect(s.multi).toHaveLength(2);
    s = reduire(s, {
      type: 'selectionner',
      selection: { genre: 'objet', id: b!.id },
      ajouter: true,
    });
    expect(s.multi).toHaveLength(0);
    expect(s.selection).toEqual({ genre: 'objet', id: a!.id });
    s = reduire(s, {
      type: 'selectionner',
      selection: { genre: 'piece', id: 'p_x' },
      ajouter: true,
    });
    expect(s.multi).toHaveLength(0);
  });

  it('rectangle, flèches, aligner, Suppr avec mur porteur confirmé', () => {
    let e = jouer([...meubles, { type: 'outil', outil: 'selection' }]);
    e = reduire(e, {
      type: 'selectionnerZone',
      a: { x: 1_000, y: 3_000 },
      b: { x: 9_000, y: 6_000 },
    });
    expect(e.multi.map((x) => x.genre)).toEqual(['objet', 'objet', 'objet']);
    const y = niveauDe(e).objets.map((o) => o.position.y);
    e = reduire(e, { type: 'deplacerClavier', delta: { x: 0, y: 100 } });
    expect(niveauDe(e).objets.map((o) => o.position.y)).toEqual(y.map((v) => v + 100));
    e = reduire(e, { type: 'alignerSelection', bord: 'haut' });
    expect(new Set(niveauDe(e).objets.map((o) => o.position.y)).size).toBe(1);
    e = reduire(e, { type: 'toutSelectionner' });
    expect(e.multi).toHaveLength(4 + 3);
    expect(reduire(e, { type: 'supprimerSelection' }).erreur).toMatch(/porteur/);
    e = reduire(e, { type: 'supprimerSelection', confirme: true });
    expect([niveauDe(e).murs.length, niveauDe(e).objets.length, e.multi.length]).toEqual([0, 0, 0]);
  });

  it('copier, changer de niveau, coller ; dupliquer ; Ctrl + C sans rien ne dit rien', () => {
    let e = jouer([
      ...meubles,
      { type: 'outil', outil: 'selection' },
      { type: 'toutSelectionner' },
      { type: 'copier' },
    ]);
    e = reduire(e, { type: 'ajouterNiveau', niveau: 'etage', copierMurs: false });
    e = reduire(e, { type: 'coller' });
    expect(niveauDe(e).murs).toHaveLength(4);
    expect(niveauDe(e).objets).toHaveLength(3);
    expect(niveauDe(e).pieces).toHaveLength(1);
    expect(e.multi).toHaveLength(7);
    e = reduire(e, {
      type: 'selectionner',
      selection: { genre: 'objet', id: niveauDe(e).objets[0]!.id },
    });
    e = reduire(e, { type: 'dupliquerSelection' });
    expect(niveauDe(e).objets).toHaveLength(4);
    const rien = jouer([{ type: 'copier' }]);
    expect([rien.copie, rien.erreur]).toEqual([null, null]);
    expect(reduire(rien, { type: 'coller' }).erreur).toMatch(/copiez/);
    expect(reduire(rien, { type: 'dupliquerSelection' }).erreur).toMatch(/Choisissez/);
  });

  it('verrous : élément puis plan entier ; l’affichage reste libre', () => {
    let e = jouer([...meubles, { type: 'outil', outil: 'selection' }]);
    const o = niveauDe(e).objets[0]!;
    e = reduire(e, { type: 'selectionner', selection: { genre: 'objet', id: o.id } });
    e = reduire(e, { type: 'verrouillerSelection', valeur: true });
    expect(reduire(e, { type: 'supprimerSelection' }).erreur).toMatch(/verrouillé/);
    e = reduire(e, { type: 'verrouillerPlan', valeur: true });
    expect(sceneDe(e).verrouille).toBe(true);
    const refus = reduire(e, { type: 'renommerNiveau', niveauId: e.niveauId, nom: 'Bas' });
    expect(refus.erreur).toMatch(/Plan verrouillé/);
    expect(sceneDe(refus)).toBe(sceneDe(e));
    // Une commande refusée pour une autre raison annonce d'abord le verrou.
    expect(reduire(e, { type: 'supprimerSelection' }).erreur).toMatch(/Plan verrouillé/);
    expect(reduire(e, { type: 'zoom', zoom: 80 }).zoom).toBe(80);
    e = reduire(e, { type: 'verrouillerPlan', valeur: false });
    expect(
      reduire(e, { type: 'renommerNiveau', niveauId: e.niveauId, nom: 'Bas' }).erreur,
    ).toBeNull();
  });

  it('raccourcis : Ctrl + C, V, D, A ; ignorés dans un champ', () => {
    const recus: string[] = [];
    // Environnement sans DOM : un événement minimal suffit (cible, touches, preventDefault).
    const touche = (key: string, dansUnChamp = false) => {
      const ev = {
        key,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        target: { closest: () => (dansUnChamp ? {} : null) },
        preventDefault: () => undefined,
      } as unknown as KeyboardEvent;
      raccourci(ev, (a) => recus.push(a.type));
    };
    for (const k of ['c', 'v', 'd', 'a']) touche(k);
    touche('c', true);
    expect(recus).toEqual(['copier', 'coller', 'dupliquerSelection', 'toutSelectionner']);
  });
});
