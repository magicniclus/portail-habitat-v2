import { describe, expect, it } from 'vitest';
import { scene as schemaScene } from '../schemas/dessinScene';
import { contexteTest, ok } from './aidesTest';
import { MODELES, sceneModele } from './modeles';
import { niveauxTries } from './niveaux';

const ctx = contexteTest();
const types = (id: (typeof MODELES)[number]['id']) =>
  niveauxTries(ok(sceneModele(id, ctx))).map((n) => n.pieces.map((p) => p.type).sort());

describe('modèles de départ (DES-01)', () => {
  it('chaque modèle donne une scène valide, pièces typées et nommées', () => {
    for (const m of MODELES) {
      const s = ok(sceneModele(m.id, ctx));
      expect(schemaScene.safeParse(s).success).toBe(true);
      for (const n of s.niveaux) {
        expect(n.pieces.length).toBeGreaterThan(0);
        expect(n.pieces.every((p) => p.type !== 'autre' && !/^Pièce \d+$/.test(p.nom))).toBe(true);
      }
    }
  });

  it('studio, T2, T3, plain-pied, maison à étage : les bonnes pièces', () => {
    expect(types('studio')).toEqual([['salle_d_eau', 'sejour']]);
    expect(types('t2')).toEqual([['chambre', 'salle_de_bain', 'sejour']]);
    expect(types('t3')).toEqual([['chambre', 'chambre', 'salle_de_bain', 'sejour']]);
    expect(types('plain_pied')).toEqual([
      ['chambre', 'chambre', 'cuisine', 'salle_de_bain', 'sejour'],
    ]);
    expect(types('etage')).toEqual([
      ['cuisine', 'entree', 'sejour'],
      ['chambre', 'chambre', 'salle_de_bain'],
    ]);
  });

  it('modèle inconnu ou incohérent refusé', () => {
    expect(sceneModele('chateau' as 'studio', ctx)).toMatchObject({ code: 'INTROUVABLE' });
    const t2 = MODELES.find((m) => m.id === 't2')!;
    const variante = (modif: Partial<typeof t2>) => sceneModele('t2', ctx, [{ ...t2, ...modif }]);
    expect(variante({ largeur: 100 })).toMatchObject({ ok: false });
    const point = { x: 1_000, y: 1_000 };
    const nul = { cloisons: [[point, point]] as [typeof point, typeof point][], pieces: [] };
    expect(variante({ niveaux: [nul] })).toMatchObject({ ok: false });
    const dehors = { cloisons: [], pieces: [[{ x: -5_000, y: 0 }, 'sejour']] as never };
    expect(variante({ niveaux: [dehors] })).toMatchObject({ code: 'PRECONDITION' });
    expect(variante({ niveaux: [t2.niveaux[0]!, nul] })).toMatchObject({ ok: false });
  });
});
