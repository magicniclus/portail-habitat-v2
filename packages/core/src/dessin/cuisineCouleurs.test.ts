import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { harmoniserCuisine } from './cuisineCouleurs';
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
});
