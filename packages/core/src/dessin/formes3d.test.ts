import { describe, expect, it } from 'vitest';
import { CATALOGUE_OBJETS, objetDuCatalogue, type SymboleObjet } from './catalogue';
import { formeObjet3D } from './formes3d';

const forme = (id: string) => {
  const o = objetDuCatalogue(id)!;
  return { o, f: formeObjet3D(o.symbole, o.dimensions, o.style) };
};

describe('volumes simples des meubles et aménagements (DES-33)', () => {
  it('chaque objet tient dans sa largeur, sa profondeur (toits compris) et sa hauteur', () => {
    for (const o of CATALOGUE_OBJETS) {
      const { l, p, h } = o.dimensions;
      for (const f of formeObjet3D(o.symbole, o.dimensions, o.style)) {
        const demi = f.pente ? 0 : f.taille.p / 2;
        expect(Math.abs(f.centre.x) + f.taille.l / 2, o.id).toBeLessThanOrEqual(l / 2 + 1);
        expect(Math.abs(f.centre.y) + demi, o.id).toBeLessThanOrEqual(p / 2 + 40);
        expect(f.centre.z + f.taille.h / 2, o.id).toBeLessThanOrEqual(Math.max(h, 2_400) + 1);
      }
    }
  });

  it('le catalogue est riche : cuisine, tables, rangements, extérieur', () => {
    const par = (c: string) => CATALOGUE_OBJETS.filter((o) => o.categorie === c).length;
    expect(par('cuisine')).toBeGreaterThanOrEqual(18);
    expect(par('sejour')).toBeGreaterThanOrEqual(15);
    expect(par('exterieur')).toBeGreaterThanOrEqual(14);
    for (const id of ['ilot-repas', 'tabouret-bar', 'table-haute', 'pergola', 'carport', 'serre'])
      expect(objetDuCatalogue(id), id).toBeDefined();
  });

  it('assez de choix : canapés, fauteuils, tables, cuisine, salle de bain, pergolas', () => {
    const compte = (motif: RegExp) => CATALOGUE_OBJETS.filter((o) => motif.test(o.id)).length;
    expect(compte(/^canape-/)).toBeGreaterThanOrEqual(6);
    expect(compte(/^fauteuil/)).toBeGreaterThanOrEqual(4);
    expect(compte(/^table-(\d|ronde|haute)/)).toBeGreaterThanOrEqual(5);
    expect(compte(/^(table-basse|bout-de-canape)/)).toBeGreaterThanOrEqual(5);
    expect(compte(/^hotte-/)).toBeGreaterThanOrEqual(3);
    expect(compte(/^(refrigerateur|frigo-|colonne-frigo)/)).toBeGreaterThanOrEqual(3);
    expect(compte(/^plaque-/)).toBeGreaterThanOrEqual(3);
    expect(compte(/^wc-/)).toBeGreaterThanOrEqual(3);
    expect(compte(/^douche-/)).toBeGreaterThanOrEqual(5);
    expect(compte(/^baignoire/)).toBeGreaterThanOrEqual(5);
    expect(compte(/vasque/)).toBeGreaterThanOrEqual(3);
    expect(compte(/^pergola/)).toBeGreaterThanOrEqual(4);
  });

  it('cuisine personnalisable : plan de travail et poignées ont leur propre teinte', () => {
    for (const id of ['meuble-bas-60', 'evier-120', 'plaque-gaz', 'meuble-tiroirs', 'ilot-repas']) {
      const teintes = new Set(forme(id).f.map((x) => x.teinte));
      expect(teintes.has('plan'), id).toBe(true);
      expect(teintes.has('poignee'), id).toBe(true);
      expect(teintes.has('principal'), id).toBe(true);
    }
  });

  it('chaque nouveau symbole a son propre dessin (pas la boîte par défaut)', () => {
    const nouveaux: SymboleObjet[] = [
      'ilot',
      'tabouret',
      'table_haute',
      'buffet',
      'etagere',
      'banc',
      'four',
      'pergola',
      'carport',
      'serre',
      'abri',
      'transat',
      'parasol',
      'jardiniere',
    ];
    for (const s of nouveaux)
      expect(formeObjet3D(s, { l: 2000, p: 1500, h: 2200 }).length, s).toBeGreaterThan(2);
  });

  it('îlot : le plan de travail déborde côté salle pour s’asseoir', () => {
    const { o, f } = forme('ilot-repas');
    const plan = f.find((x) => x.teinte === 'plan')!;
    const caisson = f.find((x) => x.teinte === 'principal')!;
    expect(plan.taille.p).toBe(o.dimensions.p);
    expect(caisson.centre.y + caisson.taille.p / 2).toBeLessThan(o.dimensions.p / 2 - 250);
  });

  it('pergola : poteaux, deux poutres et des lames sur toute la largeur', () => {
    const { f } = forme('pergola');
    const lames = f.filter((x) => x.taille.l === 40 && x.taille.h === 120);
    expect(lames.length).toBeGreaterThanOrEqual(20);
  });

  it('serre : murs et toit à deux pans vitrés ; abri : toit en prisme opaque', () => {
    const serre = forme('serre').f;
    expect(serre.some((x) => x.forme === 'prisme' && x.teinte === 'verre')).toBe(true);
    expect(serre.some((x) => x.forme === 'boite' && x.teinte === 'verre')).toBe(true);
    expect(forme('abri-jardin').f.some((x) => x.forme === 'prisme' && x.teinte === 'sombre')).toBe(
      true,
    );
  });

  it('carport : un poteau de plus au milieu quand il est long, toit à la hauteur demandée', () => {
    const { o, f } = forme('carport');
    expect(f.filter((x) => x.taille.l === 100 && x.taille.p === 100)).toHaveLength(6);
    const toit = Math.max(...f.map((x) => x.centre.z + x.taille.h / 2));
    expect(toit).toBe(o.dimensions.h);
  });

  it('bain de soleil : dossier incliné vers l’arrière', () => {
    const dossier = forme('transat').f.find((x) => x.pente)!;
    expect(dossier.pente).toBeLessThan(0);
    expect(dossier.centre.y).toBeLessThan(0);
  });
});
