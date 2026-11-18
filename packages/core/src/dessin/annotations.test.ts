import { describe, expect, it } from 'vitest';
import { contexteTest, niveauMaquette, ok } from './aidesTest';
import {
  ajouterCote,
  ajouterTexte,
  basculerCalque,
  calqueObjet,
  modifierTexte,
  objetsVisibles,
  supprimerAnnotation,
} from './annotations';
import { descriptionSelection } from './annonces';
import { CATALOGUE_OBJETS } from './catalogue';
import { nouvelleScene } from './migrations';

const ctx = contexteTest();

describe('cotes libres et textes (DES-31)', () => {
  it('ajouter, modifier, supprimer ; refus lisibles', () => {
    const n = niveauMaquette(ctx);
    const c = ok(ajouterCote(n, { x: 0, y: 0 }, { x: 3_000.4, y: 0 }, ctx));
    expect(c.cotes[0]).toMatchObject({ id: c.elementId, b: { x: 3_000, y: 0 }, decalage: 0 });
    expect(ajouterCote(n, { x: 0, y: 0 }, { x: 10, y: 0 }, ctx)).toMatchObject({ ok: false });
    const t = ok(ajouterTexte(c, { x: 500, y: 500 }, '  Placard  ', ctx));
    expect(t.textes[0]).toMatchObject({ contenu: 'Placard', taille: 14 });
    expect(ajouterTexte(c, { x: 0, y: 0 }, '   ', ctx)).toMatchObject({ ok: false });
    const m = ok(
      modifierTexte(t, t.elementId, {
        contenu: 'Cellier',
        taille: 200,
        position: { x: 1.4, y: 2 },
      }),
    );
    expect(m.textes[0]).toMatchObject({ contenu: 'Cellier', taille: 72, position: { x: 1, y: 2 } });
    expect(modifierTexte(t, t.elementId, { contenu: '' })).toMatchObject({ ok: false });
    expect(modifierTexte(t, 't_absent', {})).toMatchObject({ code: 'INTROUVABLE' });
    expect(descriptionSelection(m, { genre: 'texte', id: t.elementId })).toBe(
      'Texte choisi : Cellier.',
    );
    expect(descriptionSelection(m, { genre: 'cote', id: c.elementId })).toBe(
      'Cote choisie : 3,00 m.',
    );
    expect(descriptionSelection(n, { genre: 'cote', id: 'c_x' })).toBe('');
    expect(descriptionSelection(n, { genre: 'texte', id: 't_x' })).toBe('');
    expect(ok(supprimerAnnotation(m, 'texte', t.elementId)).textes).toHaveLength(0);
    expect(ok(supprimerAnnotation(m, 'cote', c.elementId)).cotes).toHaveLength(0);
    expect(supprimerAnnotation(n, 'cote', 'c_absent')).toMatchObject({ ok: false });
    expect(supprimerAnnotation(n, 'texte', 't_absent')).toMatchObject({ ok: false });
    const plein = {
      ...n,
      cotes: Array.from({ length: 500 }, (_, i) => ({
        id: `c_${String(i).padStart(4, '0')}`,
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
        decalage: 0,
      })),
    };
    expect(ajouterCote(plein, { x: 0, y: 0 }, { x: 100, y: 0 }, ctx)).toMatchObject({
      code: 'PRECONDITION',
    });
    const pleinT = {
      ...n,
      textes: Array.from({ length: 500 }, (_, i) => ({
        id: `t_${String(i).padStart(4, '0')}`,
        position: { x: 0, y: 0 },
        contenu: 'x',
        taille: 14,
      })),
    };
    expect(ajouterTexte(pleinT, { x: 0, y: 0 }, 'y', ctx)).toMatchObject({ code: 'PRECONDITION' });
  });
});

describe('calques du plan (DES-30)', () => {
  it('basculer un calque ; objets rangés par calque et filtrés', () => {
    const s = nouvelleScene(ctx.nouvelId);
    expect(s.calques.electricite).toBe(true);
    const sans = basculerCalque(s, 'electricite');
    expect(sans.calques.electricite).toBe(false);
    const elec = CATALOGUE_OBJETS.find((o) => o.categorie === 'electricite')!;
    const plomb = CATALOGUE_OBJETS.find((o) => o.categorie === 'chauffage')!;
    const meuble = CATALOGUE_OBJETS.find((o) => o.categorie === 'sejour')!;
    expect(calqueObjet({ catalogueId: elec.id })).toBe('electricite');
    expect(calqueObjet({ catalogueId: plomb.id })).toBe('plomberie');
    expect(calqueObjet({ catalogueId: meuble.id })).toBe('mobilier');
    expect(calqueObjet({ catalogueId: 'inconnu' })).toBe('mobilier');
    const objets = [elec, plomb, meuble].map((c, i) => ({
      id: `obj_${i}000`,
      catalogueId: c.id,
      position: { x: 0, y: 0 },
      rotation: 0,
      dimensions: { l: 100, p: 100, h: 100 },
      materiaux: {},
      altitude: 0,
    }));
    expect(objetsVisibles(objets, s.calques)).toHaveLength(3);
    expect(
      objetsVisibles(objets, basculerCalque(sans, 'plomberie').calques).map((o) => o.catalogueId),
    ).toEqual([meuble.id]);
  });
});
