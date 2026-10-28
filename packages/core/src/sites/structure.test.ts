import { describe, expect, it } from 'vitest';
import { construireSection } from './ia/operations';
import { nouvellePage } from './edition';
import { pageSite, type PageSite } from './schemas';
import {
  ajouterLigne,
  ancrerZone,
  collerNoeud,
  deplacerNoeud,
  changerDisposition,
  changerNombreBlocs,
  DISPOSITIONS,
  insererDans,
  majNoeud,
  operationNoeud,
  parentDe,
  trouverNoeud,
} from './structure';

const ids = () => {
  let n = 0;
  return () => `x${++n}`;
};

/** Zone z1 : ligne r1 (blocs c1 6/12 [e1, e2], c2 6/12 [e3]) ; zone z2 : ligne r2 (c3 [e4]). */
function page(): PageSite {
  const p = nouvellePage('Test', 'test', 1);
  const z = (id: string, nom: string, rows: unknown[]) => ({
    ...construireSection({ p: { nom }, rows: [] }, () => id),
    rows,
  });
  const ligne = (id: string, cols: unknown[]) => ({
    ...construireSection({ rows: [{ cols: [] }] }, () => id).rows[0]!,
    cols,
  });
  const bloc = (id: string, w: number, els: string[]) => ({
    ...construireSection({ rows: [{ cols: [{ w, els: [] }] }] }, () => id).rows[0]!.cols[0]!,
    els: els.map(
      (e) =>
        construireSection(
          { rows: [{ cols: [{ w: 12, els: [{ type: 'texte', p: { texte: e } }] }] }] },
          () => e,
        ).rows[0]!.cols[0]!.els[0]!,
    ),
  });
  return {
    ...p,
    sections: [
      z('z1', 'Bandeau', [ligne('r1', [bloc('c1', 6, ['e1', 'e2']), bloc('c2', 6, ['e3'])])]),
      z('z2', 'Contact', [ligne('r2', [bloc('c3', 12, ['e4'])])]),
    ] as PageSite['sections'],
  };
}

const valide = (p: PageSite) => expect(pageSite.safeParse(p).success).toBe(true);

describe('structure de la page : zone › section › bloc › élément', () => {
  it('trouve le niveau, la chaîne de parents et la position', () => {
    const p = page();
    valide(p);
    expect(trouverNoeud(p, 'z2')).toMatchObject({ niveau: 'zone', i: 1, n: 2 });
    expect(trouverNoeud(p, 'r1')).toMatchObject({ niveau: 'section', i: 0, n: 1 });
    expect(trouverNoeud(p, 'c2')).toMatchObject({ niveau: 'bloc', i: 1, n: 2 });
    const e = trouverNoeud(p, 'e2')!;
    expect(e).toMatchObject({ niveau: 'element', i: 1, n: 2 });
    expect(e.chaine.map((x) => x.id)).toEqual(['z1', 'r1', 'c1', 'e2']);
    expect(trouverNoeud(p, 'inconnu')).toBeNull();
    expect(parentDe(p, 'e2')).toBe('c1');
    expect(parentDe(p, 'z1')).toBeNull();
  });

  it('modifie les réglages de n’importe quel niveau, et la largeur d’un bloc', () => {
    const p = majNoeud(page(), 'r1', { gap: 48 });
    expect(p.sections[0]!.rows[0]!.p.gap).toBe(48);
    const q = majNoeud(p, 'c1', { w: 4, pad: 16 });
    expect(q.sections[0]!.rows[0]!.cols[0]).toMatchObject({ w: 4, p: { pad: 16 } });
    const z = majNoeud(q, 'z2', { nom: 'Devis' });
    expect(z.sections[1]!.p.nom).toBe('Devis');
    expect(
      majNoeud(z, 'e4', { align: 'center' }).sections[1]!.rows[0]!.cols[0]!.els[0]!.p,
    ).toMatchObject({
      align: 'center',
    });
    valide(z);
  });

  it('monte et descend à chaque niveau, sans effet aux bords', () => {
    const n = ids();
    expect(operationNoeud(page(), 'z2', 'haut', n).page.sections.map((s) => s.id)).toEqual([
      'z2',
      'z1',
    ]);
    const blocs = operationNoeud(page(), 'c1', 'bas', n).page.sections[0]!.rows[0]!.cols;
    expect(blocs.map((c) => c.id)).toEqual(['c2', 'c1']);
    const els = operationNoeud(page(), 'e2', 'haut', n).page.sections[0]!.rows[0]!.cols[0]!.els;
    expect(els.map((e) => e.id)).toEqual(['e2', 'e1']);
    expect(operationNoeud(page(), 'e1', 'haut', n).page).toEqual(page());
  });

  it('duplique juste après avec des identifiants neufs et sélectionne la copie', () => {
    const r = operationNoeud(page(), 'e1', 'dupliquer', ids());
    const els = r.page.sections[0]!.rows[0]!.cols[0]!.els;
    expect(els.map((e) => e.id)).toEqual(['e1', 'x1', 'e2']);
    expect(r.selection).toBe('x1');
    const z = operationNoeud(page(), 'z1', 'dupliquer', ids());
    expect(z.page.sections).toHaveLength(3);
    expect(z.page.sections[1]!.rows[0]!.cols[0]!.els[0]!.id).not.toBe('e1');
    valide(z.page);
  });

  it('dupliquer ou supprimer un bloc répartit les 12 unités', () => {
    const d = operationNoeud(page(), 'c1', 'dupliquer', ids());
    expect(d.page.sections[0]!.rows[0]!.cols.map((c) => c.w)).toEqual([4, 4, 4]);
    const s = operationNoeud(page(), 'c2', 'supprimer', ids());
    expect(s.page.sections[0]!.rows[0]!.cols.map((c) => c.w)).toEqual([12]);
    expect(s.selection).toBe('r1');
  });

  it('une section garde au moins un bloc', () => {
    const r = operationNoeud(page(), 'c3', 'supprimer', ids());
    expect(r.erreur).toMatch(/au moins un bloc/);
    expect(r.page).toEqual(page());
  });

  it('supprimer sélectionne le parent ; une zone supprimée ne laisse rien de sélectionné', () => {
    expect(operationNoeud(page(), 'e3', 'supprimer', ids()).selection).toBe('c2');
    const z = operationNoeud(page(), 'z1', 'supprimer', ids());
    expect(z.page.sections.map((s) => s.id)).toEqual(['z2']);
    expect(z.selection).toBeNull();
  });

  it('nombre de blocs : ajoute des blocs vides ou fusionne le contenu dans le dernier', () => {
    const plus = changerNombreBlocs(page(), 'r1', 3, ids());
    const c = plus.sections[0]!.rows[0]!.cols;
    expect(c.map((x) => x.w)).toEqual([4, 4, 4]);
    expect(c[2]!.els).toEqual([]);
    const moins = changerNombreBlocs(page(), 'r1', 1, ids());
    expect(moins.sections[0]!.rows[0]!.cols[0]!.els.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(changerNombreBlocs(page(), 'r1', 7, ids())).toEqual(page());
    valide(plus);
  });

  it('dispositions : 8 modèles de 12 unités, appliqués aux largeurs', () => {
    expect(DISPOSITIONS).toHaveLength(8);
    for (const d of DISPOSITIONS) expect(d.largeurs.reduce((a, b) => a + b, 0)).toBe(12);
    const p = changerDisposition(page(), 'r1', [4, 8], ids());
    expect(p.sections[0]!.rows[0]!.cols.map((c) => c.w)).toEqual([4, 8]);
    const q = changerDisposition(page(), 'r1', [3, 6, 3], ids());
    expect(q.sections[0]!.rows[0]!.cols.map((c) => c.w)).toEqual([3, 6, 3]);
    valide(q);
  });

  it('ajoute une section après la section sélectionnée, ou à la fin de la zone', () => {
    const a = ajouterLigne(page(), 'e1', [6, 6], ids())!;
    expect(a.page.sections[0]!.rows.map((r) => r.id)).toEqual(['r1', a.id]);
    expect(a.page.sections[0]!.rows[1]!.cols.map((c) => c.w)).toEqual([6, 6]);
    const b = ajouterLigne(page(), 'z2', [12], ids())!;
    expect(b.page.sections[1]!.rows.at(-1)!.id).toBe(b.id);
    // Rien de sélectionné (page vierge comprise) : une zone neuve en bas de la page.
    const vierge = { ...page(), sections: [] };
    const c = ajouterLigne(vierge, null, [4, 8], ids())!;
    expect(c.page.sections).toHaveLength(1);
    expect(c.page.sections[0]!.rows[0]!.id).toBe(c.id);
    expect(c.page.sections[0]!.rows[0]!.cols.map((x) => x.w)).toEqual([4, 8]);
    valide(c.page);
    valide(a.page);
  });

  it('insère un contenu au bon endroit selon la sélection', () => {
    const apres = insererDans(page(), 'e1', 'bouton', ids())!;
    expect(apres.page.sections[0]!.rows[0]!.cols[0]!.els.map((e) => e.id)).toEqual([
      'e1',
      apres.id,
      'e2',
    ]);
    const bloc = insererDans(page(), 'c2', 'image', ids())!;
    expect(bloc.page.sections[0]!.rows[0]!.cols[1]!.els.at(-1)!.id).toBe(bloc.id);
    const ligne = insererDans(page(), 'r2', 'titre', ids())!;
    expect(ligne.page.sections[1]!.rows[0]!.cols[0]!.els.at(-1)!.id).toBe(ligne.id);
    const zone = insererDans(page(), 'z1', 'texte', ids())!;
    expect(zone.page.sections[0]!.rows[0]!.cols[0]!.els.at(-1)!.id).toBe(zone.id);
    const bas = insererDans(page(), null, 'texte', ids())!;
    expect(bas.page.sections).toHaveLength(3);
    expect(bas.page.sections[2]!.rows[0]!.cols[0]!.els.map((e) => e.id)).toEqual([bas.id]);
    const vierge = insererDans({ ...page(), sections: [] }, null, 'titre', ids())!;
    expect(vierge.page.sections[0]!.rows[0]!.cols[0]!.els[0]!.type).toBe('titre');
    valide(vierge.page);
    valide(apres.page);
  });

  it('cas limites : nœud inconnu, reste des 12 unités, section dupliquée, zone vide', () => {
    const n = ids();
    expect(majNoeud(page(), 'inconnu', { gap: 1 })).toEqual(page());
    expect(operationNoeud(page(), 'inconnu', 'supprimer', n)).toEqual({
      page: page(),
      selection: null,
    });
    expect(
      changerNombreBlocs(page(), 'r1', 5, n).sections[0]!.rows[0]!.cols.map((c) => c.w),
    ).toEqual([3, 3, 2, 2, 2]);
    expect(changerNombreBlocs(page(), 'c1', 2, n)).toEqual(page());
    expect(changerDisposition(page(), 'e1', [6, 6], n)).toEqual(page());
    const d = operationNoeud(page(), 'r1', 'dupliquer', ids());
    expect(d.page.sections[0]!.rows).toHaveLength(2);
    expect(d.selection).toBe(d.page.sections[0]!.rows[1]!.id);
    valide(d.page);
    const vide = { ...page(), sections: [{ ...page().sections[0]!, rows: [] }] };
    const r = insererDans(vide, 'z1', 'titre', ids())!;
    expect(r.page.sections[0]!.rows[0]!.cols[0]!.els.map((e) => e.id)).toEqual([r.id]);
  });

  it('ancre d’une zone : gardée si elle existe, sinon tirée du nom et rendue unique', () => {
    const p = majNoeud(page(), 'z1', { ancre: 'contact' });
    expect(ancrerZone(p, 'z1')).toEqual({ page: p, ancre: 'contact' });
    const r = ancrerZone(p, 'z2')!;
    expect(r.ancre).toBe('contact-2');
    expect(trouverNoeud(r.page, 'z2')!.noeud.p).toMatchObject({ ancre: 'contact-2' });
    valide(r.page);
    const sansNom = majNoeud(page(), 'z2', { nom: '' });
    expect(ancrerZone(sansNom, 'z2')!.ancre).toBe('zone');
    expect(ancrerZone(p, 'r1')).toBeNull();
  });

  it('glisser-déposer : même niveau avant/après, ou dans le conteneur du dessus', () => {
    const ordre = (p: PageSite) =>
      p.sections.map((z) => z.rows.map((r) => r.cols.map((c) => c.els.map((e) => e.id))));
    // Contenu e3 avant e1 (autre bloc), puis dans le bloc c3 (autre zone).
    const a = deplacerNoeud(page(), 'e3', 'e1', 'avant')!;
    expect(ordre(a)).toEqual([[[['e3', 'e1', 'e2'], []]], [[['e4']]]]);
    const b = deplacerNoeud(page(), 'e1', 'c3', 'dans')!;
    expect(ordre(b)[1]).toEqual([[['e4', 'e1']]]);
    // Zones échangées.
    expect(deplacerNoeud(page(), 'z2', 'z1', 'avant')!.sections.map((z) => z.id)).toEqual([
      'z2',
      'z1',
    ]);
    // Bloc vers une autre section : largeurs réparties ; la section quittée garde un bloc.
    const c = deplacerNoeud(page(), 'c2', 'c3', 'apres')!;
    expect(c.sections[1]!.rows[0]!.cols.map((x) => [x.id, x.w])).toEqual([
      ['c3', 6],
      ['c2', 6],
    ]);
    expect(c.sections[0]!.rows[0]!.cols.map((x) => x.w)).toEqual([12]);
    expect(deplacerNoeud(page(), 'c3', 'c1', 'avant')).toBeNull();
    // Niveaux incompatibles, nœud dans lui-même, inconnu.
    expect(deplacerNoeud(page(), 'e1', 'z2', 'dans')).toBeNull();
    expect(deplacerNoeud(page(), 'z1', 'e1', 'avant')).toBeNull();
    expect(deplacerNoeud(page(), 'r1', 'r1', 'avant')).toBeNull();
    expect(deplacerNoeud(page(), 'x', 'e1', 'avant')).toBeNull();
    valide(a);
    valide(c);
  });

  it('copier-coller : copie aux nouveaux identifiants, placée selon la sélection', () => {
    const p = page();
    const e1 = trouverNoeud(p, 'e1')!.noeud;
    const apres = collerNoeud(p, e1, 'e3', ids())!;
    expect(apres.page.sections[0]!.rows[0]!.cols[1]!.els.map((e) => e.id)).toEqual([
      'e3',
      apres.id,
    ]);
    const dansZone = collerNoeud(p, e1, 'z2', ids())!;
    expect(dansZone.page.sections[1]!.rows[0]!.cols[0]!.els.at(-1)!.id).toBe(dansZone.id);
    const zone = trouverNoeud(p, 'z1')!.noeud;
    const z = collerNoeud(p, zone, 'e4', ids())!;
    expect(z.page.sections.map((x) => x.id)).toEqual(['z1', 'z2', z.id]);
    expect(collerNoeud(p, zone, null, ids())!.page.sections).toHaveLength(3);
    const ligne = trouverNoeud(p, 'r2')!.noeud;
    const enBas = collerNoeud({ ...p, sections: [] }, ligne, null, ids())!;
    expect(enBas.page.sections[0]!.rows[0]!.id).toBe(enBas.id);
    const bloc = trouverNoeud(p, 'c3')!.noeud;
    expect(collerNoeud(p, bloc, null, ids())).toBeNull();
    const six = changerNombreBlocs(p, 'r1', 6, ids());
    expect(collerNoeud(six, bloc, 'r1', ids())).toBeNull();
    expect(collerNoeud(p, bloc, 'c1', ids())!.page.sections[0]!.rows[0]!.cols).toHaveLength(3);
    valide(z.page);
  });
});
