import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { colorerCuisine, couleursCuisine, harmoniserCuisine } from './cuisineCouleurs';
import { modifierObjet, poserObjet } from './objets';

describe('couleurs de la cuisine (DES-23)', () => {
  const ctx = contexteTest();
  let n = niveauMaquette();
  for (const [catalogueId, x] of [
    ['meuble-bas-60', 2000],
    ['evier-120', 3000],
    ['meuble-haut-60', 4000],
    ['canape-3', 6000],
  ] as const)
    n = ok(poserObjet(n, { catalogueId, position: { x, y: 3000 } }, ctx));
  const [bas, evier, hautMeuble, canape] = n.objets;
  const couleurs = { facade: '#344a63', plan: '#c9a36f', poignee: '#1f2124' };
  n = ok(modifierObjet(n, bas!.id, { materiaux: couleurs }));

  it('copie façades, plan de travail et poignées sur tous les meubles de cuisine', () => {
    const r = ok(harmoniserCuisine(n, bas!.id));
    for (const id of [evier!.id, hautMeuble!.id])
      expect(r.objets.find((o) => o.id === id)!.materiaux).toMatchObject(couleurs);
    // Le canapé n'est pas un meuble de cuisine : il garde sa couleur.
    expect(r.objets.find((o) => o.id === canape!.id)!.materiaux).toEqual({});
  });

  it('laisse les meubles verrouillés et refuse un objet hors cuisine', () => {
    const verrou = {
      ...n,
      objets: n.objets.map((o) => (o.id === evier!.id ? { ...o, verrouille: true } : o)),
    };
    const r = ok(harmoniserCuisine(verrou, bas!.id));
    expect(r.objets.find((o) => o.id === evier!.id)!.materiaux).toEqual({});
    expect(harmoniserCuisine(n, canape!.id).ok).toBe(false);
    expect(harmoniserCuisine(n, 'inconnu').ok).toBe(false);
  });

  it('colore toute la cuisine d’un coup, et le meuble posé ensuite suit', () => {
    const r = ok(colorerCuisine(n, { plan: '#2b2c2e' }));
    for (const id of [bas!.id, evier!.id, hautMeuble!.id])
      expect(r.objets.find((o) => o.id === id)!.materiaux.plan).toBe('#2b2c2e');
    expect(r.objets.find((o) => o.id === canape!.id)!.materiaux).toEqual({});
    expect(couleursCuisine(r)).toMatchObject({ plan: '#2b2c2e', facade: '#344a63' });
    const suite = ok(poserObjet(r, { catalogueId: 'four', position: { x: 7000, y: 500 } }, ctx));
    expect(suite.objets.at(-1)!.materiaux).toMatchObject({ plan: '#2b2c2e', facade: '#344a63' });
    // Un canapé posé ensuite ne prend pas les couleurs de la cuisine.
    const canape2 = ok(
      poserObjet(r, { catalogueId: 'canape-2', position: { x: 7000, y: 4000 } }, ctx),
    );
    expect(canape2.objets.at(-1)!.materiaux).toEqual({});
    expect(colorerCuisine({ ...n, objets: [] }, { plan: '#000000' }).ok).toBe(false);
  });
});
