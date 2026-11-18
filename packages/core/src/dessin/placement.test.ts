import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette } from './aidesTest';
import { contourObjet, deplacerObjet, orienterObjet, poserObjet } from './objets';
import { placerIdealement } from './placement';
import type { Niveau, Objet } from '../schemas/dessinScene';

const ok = <T>(r: { ok: true; data: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message);
  return r.data;
};
// Pièce de la maquette : intérieur de 300 à 10 300 (x) et de 300 à 8 300 (y).
const ctx = contexteTest();
const TABLE = 1800;
const n = niveauMaquette(ctx);
const xs = (o: Objet) => contourObjet(o).map((p) => Math.round(p.x));
const ys = (o: Objet) => contourObjet(o).map((p) => Math.round(p.y));
const poser = (niv: Niveau, catalogueId: string, x: number, y: number) =>
  ok(poserObjet(niv, { catalogueId, position: { x, y } }, ctx));

describe('placement automatique (DES-22)', () => {
  it('meuble contre mur : collé dos au mur, tourné face à la pièce, même grand', () => {
    // Lit de 2 m de long, dos à 15 cm du mur de droite : il s'y colle et se tourne.
    const lit = poser(n, 'lit-160', 9000, 4000).objets[0]!;
    expect(Math.max(...xs(lit))).toBe(10_300);
    expect(lit.rotation).toBe(900);
    // Tiré à 30 cm du mur du bas : il le suit, dos au mur du bas.
    const b = poser(n, 'buffet', 3000, 700);
    const m = ok(deplacerObjet(b, b.objets[0]!.id, { x: 5000, y: 7800 }));
    expect(Math.max(...ys(m.objets[0]!))).toBe(8_300);
    expect(m.objets[0]!.rotation).toBe(1800);
  });

  it('dans un angle : calé contre les deux murs', () => {
    const o = poser(n, 'buffet', 1300, 500).objets[0]!;
    expect(Math.min(...ys(o))).toBe(300);
    expect(Math.min(...xs(o))).toBe(300);
  });

  it('meuble libre près d’un mur : redressé et bord contre le mur ; loin : inchangé', () => {
    const table = poser(n, 'table-6', 5000, 4000).objets[0]!;
    const proche: Objet = { ...table, position: { x: 5000, y: 300 + 450 + 100 }, rotation: 50 };
    const r = placerIdealement(proche, n);
    expect(r.objet.rotation).toBe(0);
    expect(Math.min(...ys(r.objet))).toBe(300);
    expect(r.guides.length).toBeGreaterThan(0);
    expect(placerIdealement(table, n)).toEqual({ objet: table, guides: [] });
  });

  it('bord à bord avec un meuble voisin de même hauteur, alignés', () => {
    let m = poser(n, 'meuble-bas-60', 3000, 600);
    m = poser(m, 'meuble-bas-60', 3700, 600);
    const [a, b] = m.objets as [Objet, Objet];
    expect(Math.min(...xs(b))).toBe(Math.max(...xs(a)));
    // Deux tables loin des murs : la seconde, lâchée à 10 cm et 5 cm de décalage, se cale.
    const t = poser(poser(n, 'table-6', 5000, 4000), 'table-6', 5000 + TABLE + 100, 4050);
    const [t1, t2] = t.objets as [Objet, Objet];
    expect(Math.min(...xs(t2))).toBe(Math.max(...xs(t1)));
    expect(t2.position.y).toBe(4000);
    // Trop loin (40 cm) : rien ne bouge.
    const loin = poser(poser(n, 'table-6', 5000, 4000), 'table-6', 5000 + TABLE + 400, 4050);
    expect(loin.objets[1]!.position).toEqual({ x: 5000 + TABLE + 400, y: 4050 });
  });

  it('voisin à gauche ; meuble trop de biais près d’un mur : laissé tel quel', () => {
    const t = poser(poser(n, 'table-6', 5000, 4000), 'table-6', 5000 - TABLE - 80, 4000);
    const [t1, t2] = t.objets as [Objet, Objet];
    expect(Math.max(...xs(t2))).toBe(Math.min(...xs(t1)));
    const table = t1;
    const biais: Objet = { ...table, position: { x: 5000, y: 900 }, rotation: 300 };
    expect(placerIdealement(biais, n).objet.rotation).toBe(300);
    // Pose sans aimant : au point cliqué, même près d'un mur.
    const libre = ok(
      poserObjet(n, { catalogueId: 'buffet', position: { x: 3000, y: 700 } }, ctx, {
        aimant: false,
      }),
    ).objets[0]!;
    expect(libre.position).toEqual({ x: 3000, y: 700 });
  });

  it('sans aimant : posé exactement où on le lâche', () => {
    const m = poser(n, 'buffet', 3000, 700);
    const id = m.objets[0]!.id;
    const libre = ok(deplacerObjet(m, id, { x: 3000, y: 900 }, { aimant: false })).objets[0]!;
    expect(libre.position).toEqual({ x: 3000, y: 900 });
    expect(libre.accrocheMurId).toBeUndefined();
  });
});

describe('rotation libre sur 3 axes', () => {
  it('angles absolus ramenés à 0–360°, inclinaisons facultatives', () => {
    const m = poser(n, 'table-6', 5000, 4000);
    const id = m.objets[0]!.id;
    expect(m.objets[0]!.inclinaison).toBeUndefined();
    const o = ok(orienterObjet(m, id, { rotation: -150, x: 3700, y: 450 })).objets[0]!;
    expect(o).toMatchObject({ rotation: 3450, inclinaison: { x: 100, y: 450 } });
    // Revenir à plat efface l'inclinaison.
    expect(
      ok(orienterObjet({ ...m, objets: [o] }, id, { x: 0, y: 0 })).objets[0]!.inclinaison,
    ).toBeUndefined();
    // Un seul axe donné : les autres sont gardés.
    const garde = ok(orienterObjet({ ...m, objets: [o] }, id, { y: 900 })).objets[0]!;
    expect(garde).toMatchObject({ rotation: 3450, inclinaison: { x: 100, y: 900 } });
    expect(orienterObjet(m, 'obj_x', { rotation: 0 })).toMatchObject({ code: 'INTROUVABLE' });
  });
});
