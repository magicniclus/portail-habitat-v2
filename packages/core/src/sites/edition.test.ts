import { describe, expect, it } from 'vitest';
import {
  annuler,
  appliquer,
  deplacer,
  dupliquerSection,
  elementsDe,
  historique,
  majElement,
  nouvellePage,
  retablir,
  slugDePage,
  supprimerSection,
} from './edition';
import { siteParDefaut } from './defaut';

const palette = {
  primaire: '#111111',
  accent: '#222222',
  clair: '#eeeeee',
  sombre: '#000000',
} as const;
const site = siteParDefaut(
  { nomCommercial: 'Durand Plomberie', metier: 'Plombier', ville: 'Pessac', photos: [] },
  palette,
);
const accueil = site.pages.accueil!;

describe('historique (80 états)', () => {
  it('annuler puis rétablir', () => {
    let h = historique(1);
    h = appliquer(h, 2);
    h = appliquer(h, 3);
    expect(h.present).toBe(3);
    h = annuler(h);
    expect(h.present).toBe(2);
    h = retablir(h);
    expect(h.present).toBe(3);
    expect(retablir(h)).toBe(h);
    expect(annuler(historique(1)).present).toBe(1);
  });

  it('une nouvelle modification efface le futur ; 80 états au plus', () => {
    let h = appliquer(appliquer(historique(0), 1), 2);
    h = appliquer(annuler(h), 9);
    expect(h.futur).toEqual([]);
    for (let i = 0; i < 200; i++) h = appliquer(h, i);
    expect(h.passe.length).toBe(80);
  });
});

describe('opérations de page', () => {
  it('déplacer borné', () => {
    expect(deplacer([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(deplacer([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(deplacer([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });

  it('dupliquer une section donne de nouveaux identifiants, sans ancre en double', () => {
    const s = accueil.sections[0]!;
    let n = 0;
    const p = dupliquerSection(
      { ...accueil, sections: [{ ...s, p: { ...s.p, ancre: 'haut' } }] },
      s.id,
      () => `x${n++}`,
    );
    expect(p.sections).toHaveLength(2);
    expect(p.sections[1]!.id).not.toBe(s.id);
    expect(p.sections[1]!.p.ancre).toBe('');
    const ids = elementsDe(p).map((e) => e.el.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(dupliquerSection(accueil, 'inconnue', () => 'x')).toBe(accueil);
  });

  it('supprimer une section', () => {
    const s = accueil.sections[0]!;
    expect(supprimerSection(accueil, s.id).sections).toHaveLength(accueil.sections.length - 1);
  });

  it('modifier un élément sans toucher aux autres', () => {
    const [premier] = elementsDe(accueil);
    const p = majElement(accueil, premier!.el.id, { mb: 42 });
    expect(elementsDe(p)[0]!.el.p.mb).toBe(42);
    const els = (x: typeof accueil) => elementsDe(x).map((e) => e.el);
    expect(els(p).slice(1)).toEqual(els(accueil).slice(1));
  });

  it('nouvelle page vide et slug unique', () => {
    const pages = { accueil, contact: { ...accueil, slug: 'contact' } };
    expect(slugDePage('Contact', pages)).toBe('contact-2');
    expect(slugDePage('Plombier à Pessac !', pages)).toBe('plombier-a-pessac');
    expect(slugDePage('***', pages)).toBe('page');
    const n = nouvellePage('Nos tarifs', 'nos-tarifs', 7);
    expect(n).toMatchObject({ statut: 'brouillon', menu: true, ordre: 7, type: 'libre' });
    expect(n.sections).toHaveLength(1);
  });
});
