import { describe, expect, it } from 'vitest';
import type { Niveau } from '../schemas/dessinScene';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import { ajouterCote, ajouterTexte } from './annotations';
import { deplacerObjet, modifierObjet, poserObjet, supprimerObjet, tournerObjet } from './objets';
import { poserOuverture } from './ouvertures';
import {
  deplacerElements,
  elementsDansRectangle,
  supprimerElements,
  verrouillerElements,
  type Element,
} from './selection';
import { alignerObjets, repartirObjets } from './alignement';
import { collerElements, copierElements } from './pressePapier';

const ctx = contexteTest();
/** Maison de 10,60 × 8,60 m, trois meubles, une cote, un texte. */
function maison(): Niveau {
  let n = niveauMaquette(ctx);
  for (const x of [2_000, 4_000, 7_000])
    n = ok(
      poserObjet(n, { catalogueId: 'canape-3', position: { x, y: 3_000 + x / 10 } }, ctx, {
        aimant: false,
      }),
    );
  n = ok(ajouterCote(n, { x: 1_000, y: 1_000 }, { x: 3_000, y: 1_000 }, ctx));
  return ok(ajouterTexte(n, { x: 5_000, y: 5_000 }, 'Séjour', ctx));
}
const objets = (n: Niveau): Element[] => n.objets.map((o) => ({ genre: 'objet', id: o.id }));

describe('sélection multiple (DES-29)', () => {
  it('rectangle : tout ce qui est entièrement dedans', () => {
    const n = maison();
    expect(elementsDansRectangle(n, { x: -500, y: -500 }, { x: 11_000, y: 9_000 })).toHaveLength(
      4 + 3 + 1 + 1,
    );
    const partiel = elementsDansRectangle(n, { x: 3_000, y: 9_000 }, { x: 1_500, y: 2_000 });
    expect(partiel).toEqual([{ genre: 'objet', id: n.objets[0]!.id }]);
  });

  it('déplacer : murs, pièce, objets, cote et texte suivent ; un verrou bloque', () => {
    const n = maison();
    const tout = elementsDansRectangle(n, { x: -500, y: -500 }, { x: 11_000, y: 9_000 });
    const d = ok(deplacerElements(n, tout, { x: 1_000, y: -200 }, ctx));
    expect(d.murs[0]!.a.x).toBe(n.murs[0]!.a.x + 1_000);
    expect(d.pieces).toHaveLength(1);
    expect(d.objets[1]!.position).toEqual({ x: 5_000, y: 3_200 });
    expect(d.cotes[0]!.a).toEqual({ x: 2_000, y: 800 });
    expect(d.textes[0]!.position).toEqual({ x: 6_000, y: 4_800 });
    // Un seul objet : les murs ne bougent pas.
    expect(ok(deplacerElements(n, objets(n).slice(0, 1), { x: 10, y: 0 }, ctx)).murs).toEqual(
      n.murs,
    );
    const v = ok(verrouillerElements(n, objets(n).slice(0, 1), true));
    expect(deplacerElements(v, objets(v), { x: 10, y: 0 }, ctx)).toMatchObject({
      code: 'PRECONDITION',
    });
    const vm = ok(verrouillerElements(n, [{ genre: 'mur', id: n.murs[0]!.id }], true));
    expect(deplacerElements(vm, tout, { x: 10, y: 0 }, ctx)).toMatchObject({ ok: false });
  });

  it('supprimer : porteur confirmé d’abord, verrou refusé ; les baies partent avec leur mur', () => {
    let n = maison();
    n = ok(poserOuverture(n, { murId: n.murs[0]!.id, type: 'porte', centre: 3_000 }, ctx));
    const mur: Element = { genre: 'mur', id: n.murs[0]!.id };
    const sans = ok(supprimerElements(n, [mur, ...objets(n)], ctx, true));
    expect(sans.murs).toHaveLength(3);
    expect(sans.ouvertures).toHaveLength(0);
    expect(sans.objets).toHaveLength(0);
    expect(sans.pieces).toHaveLength(0);
    // Les murs extérieurs de la maquette sont porteurs.
    expect(n.murs[0]!.porteur).toBe(true);
    expect(supprimerElements(n, [mur], ctx)).toMatchObject({ code: 'PRECONDITION' });
    const cloison = { ...n, murs: n.murs.map((m, i) => (i === 0 ? { ...m, porteur: false } : m)) };
    expect(ok(supprimerElements(cloison, [mur], ctx)).murs).toHaveLength(3);
    const v = ok(verrouillerElements(n, [mur], true));
    expect(supprimerElements(v, [mur], ctx, true)).toMatchObject({ code: 'PRECONDITION' });
    const t = ok(
      supprimerElements(
        n,
        [
          { genre: 'texte', id: n.textes[0]!.id },
          { genre: 'cote', id: n.cotes[0]!.id },
        ],
        ctx,
      ),
    );
    expect([t.textes.length, t.cotes.length, t.pieces]).toEqual([0, 0, n.pieces]);
  });

  it('copier-coller : nouveaux identifiants, baies remappées, pièce recréée, déverrouillé', () => {
    let n = maison();
    n = ok(poserOuverture(n, { murId: n.murs[0]!.id, type: 'porte', centre: 3_000 }, ctx));
    const tout = elementsDansRectangle(n, { x: -500, y: -500 }, { x: 11_000, y: 9_000 });
    const copie = copierElements(ok(verrouillerElements(n, tout, true)), tout);
    expect(copie.ouvertures).toHaveLength(1);
    const c = ok(collerElements(n, copie, { x: 20_000, y: 0 }, ctx));
    expect(c.murs).toHaveLength(8);
    expect(c.pieces).toHaveLength(2);
    expect(c.elements).toHaveLength(tout.length);
    const nouvelle = c.ouvertures.at(-1)!;
    expect(c.murs.find((m) => m.id === nouvelle.murId)!.a.x).toBeGreaterThanOrEqual(20_000);
    expect(new Set([...c.murs, ...c.objets].map((x) => x.id)).size).toBe(8 + 6);
    expect(c.murs.slice(4).every((m) => !m.verrouille)).toBe(true);
    expect(c.objets.slice(3).every((o) => !o.verrouille)).toBe(true);
    const objetsSeuls = ok(collerElements(n, copierElements(n, objets(n)), { x: 0, y: 100 }, ctx));
    expect(objetsSeuls.pieces).toBe(n.pieces);
    expect(collerElements(n, copierElements(n, []), { x: 0, y: 0 }, ctx)).toMatchObject({
      code: 'PRECONDITION',
    });
    const plein = { ...n, objets: Array.from({ length: 2_000 }, () => n.objets[0]!) };
    expect(collerElements(plein, copie, { x: 0, y: 0 }, ctx)).toMatchObject({
      code: 'PRECONDITION',
    });
  });

  it('aligner sur un bord, au centre ; répartir à intervalles égaux', () => {
    const n = maison();
    const haut = ok(alignerObjets(n, objets(n), 'haut'));
    const y0 = (o: Niveau['objets'][number]) => o.position.y - o.dimensions.p / 2;
    expect(new Set(haut.objets.map(y0)).size).toBe(1);
    expect(Math.min(...haut.objets.map(y0))).toBe(Math.min(...n.objets.map(y0)));
    for (const bord of ['gauche', 'centre', 'droite', 'milieu', 'bas'] as const)
      expect(alignerObjets(n, objets(n), bord).ok).toBe(true);
    expect(
      new Set(ok(alignerObjets(n, objets(n), 'centre')).objets.map((o) => o.position.x)).size,
    ).toBe(1);
    const r = ok(repartirObjets(n, objets(n), 'x'));
    expect(r.objets.map((o) => o.position.x)).toEqual([2_000, 4_500, 7_000]);
    expect(ok(repartirObjets(n, objets(n), 'y')).objets.map((o) => o.position.y)).toEqual([
      3_200, 3_450, 3_700,
    ]);
    expect(alignerObjets(n, objets(n).slice(0, 1), 'haut')).toMatchObject({ code: 'PRECONDITION' });
    expect(repartirObjets(n, objets(n).slice(0, 2), 'x')).toMatchObject({ code: 'PRECONDITION' });
    const v = ok(verrouillerElements(n, objets(n).slice(0, 1), true));
    expect(alignerObjets(v, objets(v), 'haut')).toMatchObject({ code: 'PRECONDITION' });
  });

  it('objet verrouillé : ni déplacé, ni tourné, ni modifié, ni supprimé', () => {
    const n = maison();
    const id = n.objets[0]!.id;
    const v = ok(verrouillerElements(n, [{ genre: 'objet', id }], true));
    expect(deplacerObjet(v, id, { x: 0, y: 0 })).toMatchObject({ code: 'PRECONDITION' });
    expect(tournerObjet(v, id, 900)).toMatchObject({ code: 'PRECONDITION' });
    expect(modifierObjet(v, id, { altitude: 10 })).toMatchObject({ code: 'PRECONDITION' });
    expect(supprimerObjet(v, id)).toMatchObject({ code: 'PRECONDITION' });
    expect(ok(verrouillerElements(v, [{ genre: 'objet', id }], false)).objets[0]!.verrouille).toBe(
      false,
    );
    expect(verrouillerElements(n, [{ genre: 'texte', id: n.textes[0]!.id }], true)).toMatchObject({
      ok: false,
    });
  });
});
