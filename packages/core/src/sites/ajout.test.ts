import { describe, expect, it } from 'vitest';
import { insererElement, insererSectionPrete, SECTIONS_PRETES } from './ajout';
import { nouvellePage } from './edition';
import { A_COMPLETER } from './ia/operations';
import { pageSite, section } from './schemas';

const ids = () => {
  let n = 0;
  return () => `n${++n}`;
};
const page = () => nouvellePage('Services', 'services', 1);

describe('sections prêtes (SITE_INTERNET §4.1)', () => {
  it('13 zones de la maquette, chacune valide pour le schéma une fois construite', () => {
    expect(SECTIONS_PRETES).toHaveLength(13);
    expect(new Set(SECTIONS_PRETES.map((s) => s.cle)).size).toBe(13);
    for (const s of SECTIONS_PRETES) {
      const r = insererSectionPrete(page(), s.cle, null, ids())!;
      expect(section.safeParse(r.page.sections.at(-1)).success, s.cle).toBe(true);
      expect(pageSite.safeParse(r.page).success, s.cle).toBe(true);
    }
  });

  it('aucun fait inventé : chiffres et avis restent « [à compléter] »', () => {
    for (const cle of ['chiffres', 'avis', 'faq']) {
      const json = JSON.stringify(SECTIONS_PRETES.find((s) => s.cle === cle)!.section);
      expect(json).toContain(A_COMPLETER);
    }
  });

  it('insérée après la section choisie, en bas sinon ; le modèle n’est pas modifié', () => {
    const p = page();
    const premiere = p.sections[0]!.id;
    const a = insererSectionPrete(p, 'appel', premiere, ids())!;
    expect(a.page.sections.map((s) => s.id)).toEqual([premiere, a.id]);
    const b = insererSectionPrete(a.page, 'contact', premiere, ids())!;
    expect(b.page.sections.map((s) => s.id)).toEqual([premiere, b.id, a.id]);
    const c = insererSectionPrete(b.page, 'blog', 'inconnue', ids())!;
    expect(c.page.sections.at(-1)!.id).toBe(c.id);
    expect(insererSectionPrete(p, 'inconnue', null, ids())).toBeNull();
    expect(p.sections).toHaveLength(1);
  });

  it('une ancre reste unique : la deuxième zone « contact » n’en a pas', () => {
    const a = insererSectionPrete(page(), 'contact', null, ids())!;
    const b = insererSectionPrete(a.page, 'contact', null, ids())!;
    expect(b.page.sections.map((s) => s.p.ancre).filter(Boolean)).toEqual(['contact']);
  });
});

describe('ajout d’un élément', () => {
  it('juste après l’élément sélectionné, dans sa colonne', () => {
    const p = page();
    const titre = p.sections[0]!.rows[0]!.cols[0]!.els[0]!.id;
    const r = insererElement(p, titre, 'bouton', ids());
    const els = r.page.sections[0]!.rows[0]!.cols[0]!.els;
    expect(els[1]).toMatchObject({ id: r.id, type: 'bouton' });
    expect(pageSite.safeParse(r.page).success).toBe(true);
  });

  it('à la fin de la section sélectionnée', () => {
    const p = page();
    const r = insererElement(p, p.sections[0]!.id, 'image', ids());
    expect(r.page.sections[0]!.rows.at(-1)!.cols[0]!.els.at(-1)).toMatchObject({
      id: r.id,
      type: 'image',
    });
  });

  it('rien de sélectionné : nouvelle section en bas de page', () => {
    const p = page();
    const r = insererElement(p, null, 'video', ids());
    expect(r.page.sections).toHaveLength(2);
    expect(r.page.sections[1]!.rows[0]!.cols[0]!.els[0]).toMatchObject({ id: r.id, type: 'video' });
    expect(pageSite.safeParse(r.page).success).toBe(true);
  });
});
